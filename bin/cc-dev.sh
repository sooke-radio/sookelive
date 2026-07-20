#!/usr/bin/env bash
# Brings up the cc-container dev environment correctly and drops you into a
# shell inside it, folding in everything discovered while getting this
# working - see .claude/planning/cc-container-dev-setup.md for the full
# debugging history behind each of these steps.

set -euo pipefail

REBUILD=0
BASH_SHELL=0
RESUME=0

for arg in "$@"; do
  case "$arg" in
    --rebuild)
      REBUILD=1
      ;;
    --bash)
      BASH_SHELL=1
      ;;
    --resume)
      RESUME=1
      ;;
    -h|--help)
      echo "Usage: $(basename "${BASH_SOURCE[0]}") [--rebuild] [--bash|--resume]"
      echo "  --rebuild  force-rebuild and recreate cc-container even if already running"
      echo "  --bash     attach with a bash shell instead of launching claude"
      echo "  --resume   launch claude with --resume for this attach"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ "$BASH_SHELL" == "1" ]] && [[ "$RESUME" == "1" ]]; then
  echo "Error: --bash and --resume are mutually exclusive." >&2
  exit 1
fi

if [[ "$BASH_SHELL" == "1" ]]; then
  LAUNCH_CMD=(bash)
elif [[ "$RESUME" == "1" ]]; then
  LAUNCH_CMD=(claude --resume)
else
  LAUNCH_CMD=(claude)
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

COMPOSE_MONGO="docker-compose.mongodb.yml"
COMPOSE_CC="docker-compose.cc-container.yml"
ENV_FILE="$PROJECT_ROOT/.env"
CLAUDE_DOCKER_DIR="$PROJECT_ROOT/../../cc-container"

if [[ ! -d "$CLAUDE_DOCKER_DIR" ]]; then
  echo "Error: $CLAUDE_DOCKER_DIR not found." >&2
  echo "Check out the claude-code-docker repo there, or adjust build.context in $COMPOSE_CC." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found." >&2
  echo "Create it (copy .env.example) with real values, plus DATABASE_URI pointing at sookelive-mongodb:27017. See README.md's cc-container section." >&2
  exit 1
fi

echo "==> Ensuring the shared claude-config volume exists (no-op if it already does - never overwrites existing credentials)..."
docker volume create claude-code-auth >/dev/null

echo "==> Starting mongodb (also creates sookelive-network if needed)..."
# --env-file matters here specifically: docker-compose.mongodb.yml's
# `environment:` block interpolates ${MONGO_ROOT_PASSWORD} at compose-parse
# time, which only reads the process env or a --env-file - never the
# `env_file:` directive (that just injects vars into the container's runtime
# env, after interpolation already happened). Without this flag,
# MONGO_ROOT_PASSWORD silently resolves to an empty string, MONGO_INITDB_ROOT_
# PASSWORD ends up blank, and the official mongo image refuses to start with a
# root username set but no password - crash-looping under `restart: always`.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_MONGO" up -d

CC_CONTAINER_ID="$(docker compose -f "$COMPOSE_CC" ps -q cc-container)"
CC_RUNNING=0
if [[ -n "$CC_CONTAINER_ID" ]] && [[ "$(docker inspect -f '{{.State.Running}}' "$CC_CONTAINER_ID" 2>/dev/null)" == "true" ]]; then
  CC_RUNNING=1
fi

if [[ "$CC_RUNNING" == "1" ]] && [[ "$REBUILD" == "0" ]]; then
  echo "==> cc-container already running, attaching without rebuilding..."
else
  if [[ "$REBUILD" == "1" ]]; then
    echo "==> Rebuilding cc-container (--rebuild)..."
  else
    echo "==> Starting cc-container..."
  fi
  docker compose -f "$COMPOSE_CC" up -d --build
fi

# --user claude matters: entrypoint.sh only drops from root to claude via
# gosu for the container's main process. `exec` is a separate mechanism that
# defaults to root (this image has no `USER claude` Dockerfile line), and
# since cap_drop: ALL strips CAP_DAC_OVERRIDE, a root exec shell can't even
# read files it doesn't own - like the claude-config volume's credentials -
# so without this flag you'd hit a fresh login prompt every time.
# Plain `claude` (no --resume) always starts a fresh session - see
# .claude/planning/cc-container-dev-setup.md. --resume opts back into
# `claude --resume` for this attach only; --bash swaps this for a plain
# shell instead.
echo "==> Attaching as the claude user (${LAUNCH_CMD[*]})..."
exec docker compose -f "$COMPOSE_CC" exec --user claude cc-container "${LAUNCH_CMD[@]}"
