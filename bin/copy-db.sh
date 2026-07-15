#!/usr/bin/env bash
# Copy one database to another inside the same mongodb container (both
# source and destination live in the same mongod instance) via
# mongodump | mongorestore --nsFrom/--nsTo --drop.
#
# Before dropping the destination, this takes its own mongodump backup of
# the destination db to ./db/ (independent of bin/backup-db.sh, which only
# ever backs up whatever $MONGO_DATABASE happens to be in .env - that may
# not be the same db this script is about to overwrite) so the previous
# contents can be restored with bin/mongorestore.sh if needed.
#
# Usage:
#   bin/copy-db.sh [source_db] [dest_db]
#   bin/copy-db.sh sl2db payload
#
# Defaults to copying sl2db -> payload if no args given.
#
# Requires MONGO_ROOT_PASSWORD (and optionally MONGO_ROOT_USERNAME,
# MONGO_CONTAINER_NAME) in ENV_FILE (default: this repo's .env). Override
# with the ENV_FILE env var.
#
# Set FORCE=1 to skip the confirmation prompt.

set +H
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${ENV_FILE:-$PROJECT_ROOT/.env}"

SOURCE_DB="${1:-sl2db}"
DEST_DB="${2:-payload}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found (set ENV_FILE to override the default path)" >&2
  exit 1
fi

# Non-eval KEY=VALUE loader - .env also has to work as a plain Docker
# Compose env_file (no shell escaping rules), so values may contain spaces,
# "!", "$", backticks, etc. `source`-ing it directly would re-parse those as
# shell syntax and break.
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

CONTAINER_NAME="${MONGO_CONTAINER_NAME:-sookelive-mongodb}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is not set in $ENV_FILE}"

if [[ "$SOURCE_DB" == "$DEST_DB" ]]; then
  echo "Error: source and destination db are both '$SOURCE_DB'" >&2
  exit 1
fi

if [[ "${FORCE:-}" != "1" ]]; then
  echo "This will DROP and REPLACE the '$DEST_DB' database with a copy of '$SOURCE_DB', both in container '$CONTAINER_NAME'."
  read -r -p "Continue? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

BACKUP_DIR="$PROJECT_ROOT/db"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/$(date +%Y-%m-%d-%H%M%S)-${DEST_DB}-pre-copy.bkp"

echo "==> Backing up '$DEST_DB' to $BACKUP_FILE before it's overwritten..."
docker exec -i "$CONTAINER_NAME" mongodump \
  --username "$MONGO_USER" \
  --password "$MONGO_PASS" \
  --authenticationDatabase admin \
  --db "$DEST_DB" \
  --archive > "$BACKUP_FILE"
echo "    (restore with: bin/mongorestore.sh $CONTAINER_NAME $BACKUP_FILE)"

echo "==> Copying '$SOURCE_DB' -> '$DEST_DB'..."
docker exec -i "$CONTAINER_NAME" mongodump \
  --username "$MONGO_USER" \
  --password "$MONGO_PASS" \
  --authenticationDatabase admin \
  --db "$SOURCE_DB" \
  --archive \
| docker exec -i "$CONTAINER_NAME" mongorestore \
  --username "$MONGO_USER" \
  --password "$MONGO_PASS" \
  --authenticationDatabase admin \
  --nsFrom "$SOURCE_DB.*" \
  --nsTo "$DEST_DB.*" \
  --drop \
  --archive

echo "Done. '$DEST_DB' now mirrors '$SOURCE_DB'."
