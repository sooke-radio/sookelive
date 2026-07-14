#!/usr/bin/env bash
# Brings up the cc-container dev environment correctly and drops you into a
# shell inside it, folding in everything discovered while getting this
# working - see .claude/planning/cc-container-dev-setup.md for the full
# debugging history behind each of these steps.

set -euo pipefail

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

echo "==> Starting cc-container..."
docker compose -f "$COMPOSE_CC" up -d --build

# --user claude matters: entrypoint.sh only drops from root to claude via
# gosu for the container's main process. `exec` is a separate mechanism that
# defaults to root (this image has no `USER claude` Dockerfile line), and
# since cap_drop: ALL strips CAP_DAC_OVERRIDE, a root exec shell can't even
# read files it doesn't own - like the claude-config volume's credentials -
# so without this flag you'd hit a fresh login prompt every time.
# `claude --resume` opens the session picker (or resumes directly if there's
# only one to pick), and just starts a fresh session if none exist - so this
# always drops you straight into Claude Code rather than an intermediate shell.
echo "==> Attaching as the claude user..."
exec docker compose -f "$COMPOSE_CC" exec --user claude cc-container claude
