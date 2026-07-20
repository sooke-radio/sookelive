#!/usr/bin/env bash
# Entrypoint for the cc-container service in docker-compose.cc-container.yml.
# Installs deps if needed, starts `pnpm dev` in the background so it's
# already up by the time you exec into the container, then keeps the
# container alive the same way the plain `sleep infinity` command used to.
#
# Claude Code (running inside this same container) can follow the dev
# server's output at /tmp/dev-server.log, and restart it after a dependency
# change with: pkill -f 'pnpm dev' (or 'next dev'); nohup pnpm dev > /tmp/dev-server.log 2>&1 &
#
# Deliberately NOT `set -e`: a failed `corepack enable`/`pnpm ii`/`pnpm dev`
# should be visible and skip straight to keeping the container up, not kill
# the whole container - otherwise a broken install means you can't even
# `docker compose exec` in to debug it.
set -uo pipefail

cd /workspace/sookelive

setup_ok=1

# The claude-code-docker image doesn't ship pnpm. Enable it via corepack
# (bundled with Node since v14.19/16.9+, same mechanism this project's own
# Dockerfile uses) once, so the rest of this script - and any interactive
# shell in the container - can just call `pnpm` directly afterwards.
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    echo "==> pnpm not found, enabling it via corepack..."
    if ! corepack enable; then
      echo "==> corepack enable failed" >&2
      setup_ok=0
    fi
  else
    echo "Error: neither pnpm nor corepack found in this image - can't run the dev server." >&2
    setup_ok=0
  fi
fi

if [[ "$setup_ok" == "1" && ! -d node_modules ]]; then
  echo "==> node_modules missing, running pnpm ii..."
  if ! pnpm ii; then
    echo "==> pnpm ii failed" >&2
    setup_ok=0
  fi
fi

if [[ "$setup_ok" == "1" ]]; then
  echo "==> Starting pnpm dev in the background (logs: /tmp/dev-server.log)..."
  nohup pnpm dev > /tmp/dev-server.log 2>&1 &
  echo "pnpm dev started, pid $!"
else
  echo "==> Skipping dev server start due to the failure above. Container is staying up so you can debug from inside: docker compose -f docker-compose.cc-container.yml exec cc-container bash" >&2
fi

exec sleep infinity
