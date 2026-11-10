# Compose Bake vs `build.network: host`

**Status: DONE (2026-11-10)** — confirmed working by the user. Follow-ups below (host-network build hardening, old image cleanup) remain optional.

## Goal

Deploy builds must keep reaching MongoDB on `127.0.0.1:27017` during
`next build` (host networking) without hitting Bake's entitlement error, and
without the Mongo password living in build args.

## Approach (implemented)

- Newer Docker Compose delegates `up --build` to BuildKit Bake, which rejects
  `build.network: host` with `additional privileges requested: pass
  "--allow=network.host"`. Compose can't pass that flag, so `deploy.yml` now runs
  `docker buildx bake -f docker-compose.yml --allow=network.host` then
  `docker compose up -d --no-build`.
- Bake does NOT derive an image tag from the compose project name (unlike
  `compose build`). Without `image:` it builds an untagged image and
  `compose up --no-build` silently reuses the old `<project>-payload` image.
  `docker-compose.yml` therefore sets `image: ${CONTAINER_NAME:-sookelive-payload}:latest`.
- `MONGO_ROOT_PASSWORD` is a BuildKit secret (`.secrets/mongo_root_password`,
  written by the deploy workflow, gitignored) mounted only for `RUN pnpm build`,
  instead of ARG/ENV. This clears the `SecretsUsedInArgOrEnv` lint and keeps the
  value out of `bake --print`, provenance and CI logs.

## Open questions / follow-ups

- Build still runs on the host network, so install scripts could reach host
  localhost services. Consider `--ignore-scripts`/an allowlist and a read-only
  Mongo user for the build.
- The Dockerfile's `COPY . .` still copies the server `.env` (which contains the
  password) into the build stage; it never reaches the final `run` stage. Needed
  today for `NEXT_PUBLIC_*`/S3 vars.
- First deploy after this change renames the image from `<dir>-payload` (e.g.
  `stg-payload`) to `$CONTAINER_NAME` (e.g. `sookelive-stg`); remove the old image
  with `docker rmi stg-payload` once confirmed.
- Long term: stop needing DB access during `next build` and drop host networking.

## Status

Implemented on branch `fix-build-bake-secrets`; untested in CI.
