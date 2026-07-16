#!/usr/bin/env bash
# Sync prd's database and media assets into stg, for testing against real
# data. prd and stg run as separate app containers on the same host and
# share one mongodb container (see docker-compose.yml's per-branch
# `container_name: sookelive-${BRANCH_NAME}` and docker-compose.mongodb.yml's
# single shared `sookelive-mongodb`) - so, unlike bin/sync-prod-db.sh/
# sync-prod-media.sh, this never goes over SSH, only local `docker exec`.
#
# DB: copies prd's database (default: sl2db) onto stg's database (default:
# stg) inside the shared mongo container, via bin/copy-db.sh - which also
# backs up stg's previous db to ./db/ first (restore with bin/mongorestore.sh
# if needed).
#
# Media: copies /app/public/media from the prd app container into the stg
# app container via `docker exec` + tar (same mechanism as
# bin/sync-prod-media.sh, just container-to-container instead of over SSH).
# Additive by default (never deletes stg-only files); set CLEAN=1 to wipe
# stg's media first for an exact mirror.
#
# Usage (run on the server, from the stg deploy checkout so it picks up
# stg's own .env for the shared mongo container's credentials):
#   bin/sync-prd-to-stg.sh
#   PRD_DB=sl2db STG_DB=stg PRD_CONTAINER=sookelive-prd STG_CONTAINER=sookelive-stg bin/sync-prd-to-stg.sh
#
# Set FORCE=1 to skip the confirmation prompt.

set +H
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PRD_DB="${PRD_DB:-sl2db}"
STG_DB="${STG_DB:-stg}"
PRD_CONTAINER="${PRD_CONTAINER:-sookelive-prd}"
STG_CONTAINER="${STG_CONTAINER:-sookelive-stg}"

if [[ "${FORCE:-}" != "1" ]]; then
  echo "This will replace stg's '$STG_DB' database with a copy of prd's '$PRD_DB', and copy prd's ($PRD_CONTAINER) media into stg's ($STG_CONTAINER) public/media."
  read -r -p "Continue? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "==> Syncing database: '$PRD_DB' -> '$STG_DB'..."
# copy-db.sh does its own destination backup before dropping - FORCE=1 here
# just skips its (redundant) confirmation prompt, since we already asked above.
FORCE=1 "$SCRIPT_DIR/copy-db.sh" "$PRD_DB" "$STG_DB"

if [[ "${CLEAN:-}" == "1" ]]; then
  echo "==> CLEAN=1: wiping stg media in '$STG_CONTAINER' before sync..."
  docker exec "$STG_CONTAINER" find /app/public/media -mindepth 1 -delete
fi

echo "==> Syncing media: '$PRD_CONTAINER' -> '$STG_CONTAINER'..."
docker exec "$PRD_CONTAINER" tar -cf - -C /app/public/media . \
  | docker exec -i "$STG_CONTAINER" tar -xf - -C /app/public/media

echo "Done. stg's '$STG_DB' database and public/media now reflect prd ('$PRD_DB' / $PRD_CONTAINER)."
