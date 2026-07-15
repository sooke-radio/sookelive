#!/usr/bin/env bash
# Pull the public/media directory (image uploads etc.) from a deployed
# sooke.live server (stg or prd) over SSH into this repo's local
# public/media/ - e.g. for reproducing/debugging real images during
# development.
#
# Media lives in a Docker named volume (web_media, see docker-compose.yml)
# mounted into the running app container at /app/public/media - not a plain
# host directory - so this goes through `docker exec` + tar the same way
# bin/sync-prod-db.sh goes through `docker exec` + mongodump, rather than
# trying to read the volume's backing files directly (would need root on
# the host).
#
# By default this only adds/overwrites files - it never deletes anything
# already in local public/media/ (so local-only test images are left
# alone). Set CLEAN=1 to wipe local public/media/ first for an exact mirror
# of prod's contents.
#
# Usage:
#   bin/sync-prod-media.sh <user@host>
#   PROD_SSH_HOST=autobot@1.2.3.4 bin/sync-prod-media.sh
#
# Requires:
#   - SSH access to the remote host (same key/user used by the deploy
#     workflow, see .github/workflows/deploy.yml)
#   - the remote app container running under its default name
#     (sookelive-payload) - override with PROD_APP_CONTAINER_NAME
#
# Run this on the host, not inside cc-container - cc-container's outbound
# firewall is expected to block SSH (see bin/sync-prod-db.sh).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PROD_HOST="${1:-${PROD_SSH_HOST:-}}"

if [[ -z "$PROD_HOST" ]]; then
  echo "Usage: $0 <user@host>" >&2
  echo "   or: PROD_SSH_HOST=user@host $0" >&2
  exit 1
fi

REMOTE_CONTAINER="${PROD_APP_CONTAINER_NAME:-sookelive-payload}"
LOCAL_MEDIA_DIR="$PROJECT_ROOT/public/media"
mkdir -p "$LOCAL_MEDIA_DIR"

if [[ "${CLEAN:-}" == "1" ]]; then
  if [[ "${FORCE:-}" != "1" ]]; then
    echo "CLEAN=1: this will DELETE everything currently in $LOCAL_MEDIA_DIR before syncing from $PROD_HOST."
    read -r -p "Continue? [y/N] " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "Aborted."
      exit 1
    fi
  fi
  find "$LOCAL_MEDIA_DIR" -mindepth 1 -delete
fi

echo "==> Pulling media from '$REMOTE_CONTAINER' on $PROD_HOST into $LOCAL_MEDIA_DIR..."
ssh "$PROD_HOST" "docker exec '$REMOTE_CONTAINER' tar -cf - -C /app/public/media ." \
  | tar -xf - -C "$LOCAL_MEDIA_DIR"

echo "Done. $(find "$LOCAL_MEDIA_DIR" -type f | wc -l | tr -d ' ') files now in $LOCAL_MEDIA_DIR."
