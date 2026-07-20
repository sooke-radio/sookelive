# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sooke.live — an online community radio station website built with Payload CMS 3 and Next.js 15 (App Router) in a single app, backed by MongoDB. Live audio streaming and playlist/schedule data come from an external [Azuracast](https://www.azuracast.com/) instance. Deployed with Docker Compose behind a Caddy reverse proxy, via GitHub Actions.

## Commands

Package manager is **pnpm** (a `yarn.lock` also exists but is stale).

```bash
pnpm ii               # install deps (pnpm install)
pnpm dev              # dev server at http://localhost:3000 (admin at /admin)
pnpm build            # production build (runs next-sitemap in postbuild)
pnpm dev:prod         # clean .next, build, and start in prod mode
pnpm lint / lint:fix  # ESLint via next lint
pnpm typecheck        # tsc --noEmit
pnpm test:unit        # Vitest unit tests (src/**/*.spec.ts) — no DB needed
pnpm test:int         # Vitest integration tests (tests/int/) — spins up mongodb-memory-server + msw-mocked Azuracast
pnpm generate:types   # regenerate src/payload-types.ts — run after any collection/field change
pnpm generate:importmap  # regenerate the Payload admin import map after adding admin components
```

A local `.env` is required (copy `.env.example`); `DATABASE_URI` must point at a running MongoDB.

## Architecture

Next.js and Payload run in one app via two route groups:

- `src/app/(frontend)` — the public site: pages by slug, `posts`, `shows`, `search`, sitemaps, and `next/preview` + `next/exit-preview` routes for draft preview.
- `src/app/(payload)` — the Payload admin UI (`/admin`) and REST/GraphQL API (`/api/...`). `importMap.js` is generated, don't hand-edit.

Everything is wired together in `src/payload.config.ts`: collections, globals (Header/Footer), plugins, the mailer (nodemailer/SMTP), and the jobs queue.

### Content model

Collections live in `src/collections/` — Pages, Posts, Shows, Media, Categories, Genres, Hosts, Users, Playlists. Larger collections are directories with an `index.ts` plus `hooks/` (mostly `revalidate*` hooks that call Next's `revalidatePath`/`revalidateTag` on change — draft-aware content is statically rendered and depends on these for freshness). Those hooks only fire on real Payload document mutations — anything that changes the database directly (e.g. `bin/sync-prd-to-stg.sh`'s `mongorestore`) bypasses them, leaving stale cached pages. `POST /api/revalidate-all` (`src/endpoints/revalidateAll.ts`, same `isAuthenticatedOrCronSecret` auth as the jobs/playlists-sync endpoints) force-revalidates every page in one call; there's also a "Revalidate All Pages" button on the Media admin list view for manual use.

Pages and Shows are built from **blocks** (`src/blocks/`, rendered by `RenderBlocks.tsx`) and **heros** (`src/heros/`, rendered by `RenderHero.tsx`). Access control helpers are in `src/access/` (`anyone`, `authenticated`, `authenticatedOrPublished`).

After changing any collection or field config, run `pnpm generate:types` — frontend code imports types from `src/payload-types.ts` (aliased as `@/payload-types`). The alias `@/*` maps to `src/*` and `@payload-config` to `src/payload.config.ts`.

### Azuracast integration (radio-specific core)

- `src/stream/azuracast/api.ts` — small fetch client for the Azuracast station API (authenticated with `AZURACAST_KEY`). Note: the base URL is currently hard-coded, not read from `AZURACAST_URL`.
- `src/stream/azuracast/nowplaying.tsx` — now-playing data for the player.
- `src/stream/player/` — the site-wide audio stream player (Howler.js), client components.
- `src/schedule/` — show schedule UI built from playlist schedule data.
- **Playlists sync flow**: `Playlists` collection is read-only in the admin and mirrors Azuracast playlists. A custom endpoint `POST /api/playlists/sync` (defined in `src/collections/Playlists/index.ts`) pulls playlists from Azuracast and upserts/deletes local docs. The Payload jobs task `src/tasks/syncAzuracast.ts` calls that endpoint on a cron (`*/15 * * * *`, queue `sync-azuracast`); jobs auto-run only when `NODE_ENV=production` or `ENABLE_JOBS=true`. The jobs run endpoint accepts a logged-in user or `Authorization: Bearer $CRON_SECRET`.

`NEXT_PUBLIC_STREAM_DISABLED=true` (the dev default) turns the stream player off.

## Environments & deployment

Branch-driven deploys: pushing to `stg` or `prd` triggers `.github/workflows/deploy.yml`, which rsyncs the repo to the server, writes secrets to `.secrets/.env` on the host (from GitHub secrets, merged with the non-secret `.env.stg`/`.env.prd` for that branch), then runs `docker compose up -d --build`. Development happens on `main`/feature branches.

Docker is split into three compose files (see README for full details): `docker-compose.mongodb.yml` (DB, managed independently), `docker-compose.yml` (the app, no host ports exposed), and `docker-compose.caddy.yml` (Caddy, the only thing exposing 80/443, proxying to `sookelive-payload:3000` over the `sookelive-network` Docker network).

`bin/backup-db.sh` takes a mongodump of the containerized DB into `db/` (restore with `bin/mongorestore.sh`).

If you (Claude) are running inside the `cc-container` service from `docker-compose.cc-container.yml`: `pnpm dev` is already running in the background (started by `bin/cc-container-start.sh`), logging to `/tmp/dev-server.log` — read/tail that file directly rather than starting a second dev server. Restart it after a dependency change with `pkill -f 'pnpm dev'` then `nohup pnpm dev > /tmp/dev-server.log 2>&1 &`.

## Planning notes

Feature planning notes and cleanup TODOs live as markdown files in `.claude/planning/`. Check `.claude/planning/cleanup-suggestions.md` for known cruft to tidy opportunistically when touching nearby code, and add a note there rather than doing unrelated cleanup mid-feature.


## Development Practices

- After completing implemention of a feature or plan, always do a review of new changes for security flaws or vulnerabilities.
- After completing implementation of a feature or plan, always review new changes for best practices and code smells.
- Do not push to 'main' 'prod' 'stg' or other protected branches without express permission.
- Never hardcode or transmit environment variables (including dev variables) to any outside services for any reason.
