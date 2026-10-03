#!/usr/bin/env bash
# full mongodump backup of the configured database, using credentials from .env
# writes to ./db/{date}-mongo.bkp (restore with bin/mongorestore.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found" >&2
  exit 1
fi

# read a value from .env literally (no shell expansion, so $ ! # ` etc. in
# passwords survive); strips one pair of surrounding quotes
env_get() {
  local line val
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$ENV_FILE" | tail -n1 || true)"
  val="${line#*=}"
  if [[ "$val" =~ ^\"(.*)\"$ || "$val" =~ ^\'(.*)\'$ ]]; then
    val="${BASH_REMATCH[1]}"
  fi
  printf '%s' "$val"
}

DATABASE_URI="$(env_get DATABASE_URI)"
CONTAINER_NAME="$(env_get MONGO_CONTAINER_NAME)"; CONTAINER_NAME="${CONTAINER_NAME:-sookelive-mongodb}"
MONGO_USER="$(env_get MONGO_ROOT_USERNAME)"; MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="$(env_get MONGO_ROOT_PASSWORD)"
MONGO_DB="$(env_get MONGO_DATABASE)"; MONGO_DB="${MONGO_DB:-payload}"

if [[ -z "$MONGO_PASS" && -z "$DATABASE_URI" ]]; then
  echo "Error: MONGO_ROOT_PASSWORD is not set in $ENV_FILE" >&2
  exit 1
fi

BACKUP_DIR="$PROJECT_ROOT/db"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/$(date +%Y-%m-%d)-mongo.bkp"

if [[ -n "${DATABASE_URI:-}" ]]; then
  docker exec -i "$CONTAINER_NAME" mongodump --uri="$DATABASE_URI" --archive > "$BACKUP_FILE"
else
  docker exec -i "$CONTAINER_NAME" mongodump \
    --username "$MONGO_USER" \
    --password "$MONGO_PASS" \
    --authenticationDatabase admin \
    --db "$MONGO_DB" \
    --archive > "$BACKUP_FILE"
fi

echo "Backup written to $BACKUP_FILE"
