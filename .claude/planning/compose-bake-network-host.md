# Compose Bake vs `build.network: host`

## Problem

`docker-compose.yml` sets `build.network: host` on `payload` so `next build`
can reach MongoDB at `127.0.0.1:27017` for static generation. Newer Docker
Compose delegates `up --build` to BuildKit Bake, which treats host networking
as an entitlement and fails with:

    additional privileges requested: pass "--allow=network.host" to grant requested privileges

Compose has no way to pass `--allow`.

## Current workaround

`deploy.yml` runs `COMPOSE_BAKE=false docker compose up -d --build`, which
uses the classic build path where `network: host` needs no entitlement.
Runtime is unaffected (the container joins `sookelive-network` and uses the
`mongodb` service name).

## If the workaround stops working (option 3)

If Compose removes the legacy build path, run the build separately from compose
with the entitlement granted explicitly:

1. `docker buildx bake --allow=network.host <target>` (or `docker build --network=host`)
   to build/tag the image, using a bake file or the same build args as compose.
2. `docker compose up -d --no-build` to recreate the container from that image.

This grants build steps access to host localhost services, so also:
- use `pnpm install --frozen-lockfile`; consider limiting install scripts
- use a read-only Mongo user for the build
- move `DATABASE_URI` / Mongo password from build `args` to build secrets
  (they currently end up in image history)

## Better long-term

Stop needing DB access during `next build` (dynamic/`force-dynamic` pages),
then drop `build.network: host` entirely.

## Status

Workaround applied on `stg` (uncommitted until reviewed). Revisit if the deploy fails again on the build step.
