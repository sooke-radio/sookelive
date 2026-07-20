#!/usr/bin/env bash
# Pull a fresh mongodump from a deployed sooke.live server (stg or prd) over
# SSH and restore it into the local mongodb container - e.g. for seeding the
# database used by cc-container during development.
#
# This REPLACES the local database with production data (--drop). It does
# not touch the remote database. Prod and local don't have to use the same
# database name (e.g. this repo's own dev .env uses "sl-p3") - the dump is
# scoped to prod's database and remapped to whatever DATABASE_URI/
# MONGO_DATABASE names locally, so it lands where the app actually reads
# from either way.
#
# Usage:
#   bin/sync-prod-db.sh <user@host> <remote-deploy-path>
#   PROD_SSH_HOST=autobot@1.2.3.4 PROD_DEPLOY_PATH=/home/autobot/sookelive bin/sync-prod-db.sh
#
# Requires:
#   - SSH access to the remote host (same key/user used by the deploy
#     workflow, see .github/workflows/deploy.yml)
#   - the local mongodb container already running:
#       docker compose -f docker-compose.mongodb.yml up -d
#   - MONGO_ROOT_PASSWORD etc. set in ENV_FILE (default: this repo's .env -
#     see docker-compose.mongodb.yml/env_file and README.md's cc-container
#     section). Override with the ENV_FILE env var.

# Disable history expansion explicitly - without this, a password containing
# "!" can be misparsed (e.g. "event not found") if this script is sourced
# into an interactive shell, or if a remote login shell has histexpand
# enabled globally. `source`d files and non-interactive scripts don't use it
# by default, but this makes the script immune regardless of that context.
set +H
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env}"

PROD_HOST="${1:-${PROD_SSH_HOST:-}}"
PROD_DEPLOY_PATH="${2:-${PROD_DEPLOY_PATH:-}}"

if [[ -z "$PROD_HOST" || -z "$PROD_DEPLOY_PATH" ]]; then
  echo "Usage: $0 <user@host> <remote-deploy-path>" >&2
  echo "   or: PROD_SSH_HOST=user@host PROD_DEPLOY_PATH=/path/to/deploy $0" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found (set ENV_FILE to override the default path)" >&2
  exit 1
fi

# Load KEY=VALUE lines without evaluating them as bash - this file also has
# to work as a plain Docker Compose env_file (no shell escaping rules), so
# values may contain spaces, "!", "$", backticks, etc. `source`-ing it
# directly would re-parse those as shell syntax and break; this doesn't.
load_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    export "$key=$value"
  done < "$file"
}
load_env_file "$ENV_FILE"

LOCAL_CONTAINER="${MONGO_CONTAINER_NAME:-sookelive-mongodb}"
LOCAL_USER="${MONGO_ROOT_USERNAME:-admin}"
LOCAL_PASS="${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is not set in $ENV_FILE}"

# Dev's local DB name doesn't necessarily match prod's - e.g. this repo's own
# .env has DATABASE_URI pointing at "sl-p3" while prod defaults to "payload"
# (docker-compose.yml's MONGO_DATABASE fallback). Prefer an explicit
# MONGO_DATABASE if set locally, else parse it out of DATABASE_URI's path,
# else fall back to the same "payload" default docker-compose.yml uses.
LOCAL_DB_NAME="${MONGO_DATABASE:-}"
if [[ -z "$LOCAL_DB_NAME" && -n "${DATABASE_URI:-}" && "$DATABASE_URI" =~ ^mongodb://[^/]+/([^?]+) ]]; then
  LOCAL_DB_NAME="${BASH_REMATCH[1]}"
fi
LOCAL_DB_NAME="${LOCAL_DB_NAME:-payload}"

REMOTE_CONTAINER="${PROD_MONGO_CONTAINER_NAME:-sookelive-mongodb}"

if [[ "${FORCE:-}" != "1" ]]; then
  echo "This will DROP and REPLACE the local '$LOCAL_DB_NAME' database in '$LOCAL_CONTAINER' with a copy of production data from $PROD_HOST."
  read -r -p "Continue? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Same non-eval KEY=VALUE loader, run remotely over SSH via a bash -s
# heredoc, reused below for both the db-name lookup and the dump itself.
# Built via a *quoted* heredoc (<<'FN_EOF') rather than a single-quoted
# string, so the literal `\'` in the regex below doesn't have to survive
# bash's "no escaping at all inside single quotes" rule.
REMOTE_LOAD_ENV_FILE_FN=$(cat <<'FN_EOF'
load_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    export "$key=$value"
  done < "$file"
}
FN_EOF
)

echo "==> Determining remote database name..."
# A separate, tiny SSH call (its stdout is safe to read directly, unlike the
# dump call below whose stdout is the binary archive) - needed explicitly
# because mongorestore's --nsFrom/--nsTo remapping (further down) requires
# knowing prod's exact source database name, not just a wildcard guess.
REMOTE_DB_NAME="$(ssh "$PROD_HOST" "PROD_DEPLOY_PATH='$PROD_DEPLOY_PATH' bash -s" <<REMOTE_DBNAME_SCRIPT
set +H
set -euo pipefail
cd "\$PROD_DEPLOY_PATH"
$REMOTE_LOAD_ENV_FILE_FN
load_env_file .env
echo "\${MONGO_DATABASE:-payload}"
REMOTE_DBNAME_SCRIPT
)"
echo "    prod database: '$REMOTE_DB_NAME'"

TMP_DUMP="$(mktemp)"
trap 'rm -f "$TMP_DUMP"' EXIT

echo "==> Dumping production database on $PROD_HOST:$PROD_DEPLOY_PATH..."
# Piped in via a quoted heredoc (no local expansion at all) so the remote
# password never has to survive a second round of local quoting/escaping -
# PROD_DEPLOY_PATH/REMOTE_CONTAINER/REMOTE_DB_NAME are passed as env vars
# instead. This also sidesteps any remote shell config (e.g. a global
# histexpand) that might otherwise choke on "!" in the sourced password.
ssh "$PROD_HOST" "PROD_DEPLOY_PATH='$PROD_DEPLOY_PATH' REMOTE_CONTAINER='$REMOTE_CONTAINER' REMOTE_DB_NAME='$REMOTE_DB_NAME' bash -s" <<'REMOTE_SCRIPT' > "$TMP_DUMP"
set +H
set -euo pipefail
cd "$PROD_DEPLOY_PATH"

# Same non-eval KEY=VALUE loader as the local side - .env is generated by
# the deploy workflow's own env_file conventions, not guaranteed to be
# valid bash, so don't `source` it directly.
load_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    export "$key=$value"
  done < "$file"
}
load_env_file .env

# Scope the dump to just the app's database - both to avoid pulling down
# admin/config/local system databases, and so the restore side can remap
# it to the local DB name via an exact (not wildcard-guessed) --nsFrom.
docker exec -i "$REMOTE_CONTAINER" mongodump \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db "$REMOTE_DB_NAME" \
  --archive
REMOTE_SCRIPT

echo "==> Restoring into local container '$LOCAL_CONTAINER' database '$LOCAL_DB_NAME' (--drop)..."
# --nsFrom/--nsTo must have the same number of wildcards, matched
# positionally - "$REMOTE_DB_NAME.*" -> "$LOCAL_DB_NAME.*" is MongoDB's own
# documented single-wildcard (collection-name-only) database rename form.
# Without this remap, mongorestore would restore under prod's original
# database name, landing in a database nothing in this repo's
# DATABASE_URI points at.
docker exec -i "$LOCAL_CONTAINER" mongorestore \
  --username "$LOCAL_USER" \
  --password "$LOCAL_PASS" \
  --authenticationDatabase admin \
  --nsFrom "$REMOTE_DB_NAME.*" \
  --nsTo "$LOCAL_DB_NAME.*" \
  --drop \
  --archive < "$TMP_DUMP"

echo "Done. Local '$LOCAL_DB_NAME' database now mirrors production '$REMOTE_DB_NAME' ($PROD_HOST)."

