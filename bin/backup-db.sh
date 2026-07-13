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

set -a
source "$ENV_FILE"
set +a

CONTAINER_NAME="${MONGO_CONTAINER_NAME:-sookelive-mongodb}"
MONGO_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:?MONGO_ROOT_PASSWORD is not set in $ENV_FILE}"
MONGO_DB="${MONGO_DATABASE:-payload}"

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
