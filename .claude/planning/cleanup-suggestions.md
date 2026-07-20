# Cleanup suggestions

Running list of cruft found in the codebase (2026-07-07 audit). Fix these opportunistically when working in the affected area; check items off as they land.

## Quick deletions

- [x] **`51.222.13.157` (repo root)** — was already gone by the time this branch (`cc-cleanup`) started; no action needed.
- [x] **`Dockerfile-bkp`** — deleted.
- [x] **`yarn.lock`** — deleted.
- [x] **`src/app/(frontend)/next/exit-preview/GET.ts`** — deleted (duplicate of `route.ts`).
- [x] **Template boilerplate** — removed per user confirmation: deleted `src/components/BeforeLogin`/`BeforeDashboard`, the `beforeLogin`/`beforeDashboard` config + comments in `payload.config.ts`, and regenerated the import map (no stale entries remained).
- [x] **`claude.md` (repo root, lowercase)** — deleted.

## Correctness / security

- [x] **`POST /api/playlists/sync` is unauthenticated** — fixed in the `cc-automated-testing` branch: requires `req.user` or `Authorization: Bearer $CRON_SECRET` (same pattern as the jobs `run` access check in `payload.config.ts`), verified with a live 401/200 check and locked in with an integration test.
- [x] **`syncAzuracast` task's sync logic duplicated the endpoint's** — fixed: extracted into `syncPlaylists()` (`src/collections/Playlists/syncPlaylists.ts`), used by the endpoint. The task **still** calls the endpoint over HTTP, though - turns out that's load-bearing, not cruft: `Playlists`' `afterChange`/`afterDelete` hooks call `revalidatePath`/`revalidateTag`, which require a real Next.js request-scoped store. An earlier version of this fix had the task call `syncPlaylists()` directly (no HTTP hop), which looked like a clean simplification but made the cron job throw and fail on every run, since a plain `Cron`/`setTimeout` callback has no such context. Caught by a code-review sub-agent verifying against `next`'s actual source (`workAsyncStorage`/`revalidate.js`) before merging, not by the test suite - see the automated-testing.md test-gap note this added.
- [x] **Cron comment mismatch** — fixed: the `*/15 * * * *` cadence was correct (matches the docs and the 15-minute sync interval), comment corrected to "every 15 minutes".
- [x] **Hard-coded Azuracast base URL** — fixed in the `cc-automated-testing` branch: now built from `AZURACAST_URL`/`AZURACAST_STATION_ID`, falling back to the `NEXT_PUBLIC_` vars and then the old hardcoded value.
- [x] **`syncPlaylists` wiped all local playlists if Azuracast returned an empty array** — fixed: `syncPlaylists()` now short-circuits on a zero-length response, logs a warning via `payload.logger.warn`, and returns `{ warning, results: [] }` without deleting anything; the `/sync` endpoint passes `warning` through in its JSON response. Locked in with integration tests.

## Docker / deploy

- [x] **Dockerfile dead lines** — the `RUN NODE_ENV=production` no-op and the base-stage `COPY . .` were already gone by this branch (config already uses `ENV NODE_ENV=production` in the build stage and copies the full source only after the cached `install` stage — layer caching for deps was already correct). Fixed the two real issues: `EXPOSE $EXPOSE_PORT` (undefined ARG) → `EXPOSE 3000`; removed the dead commented-out migrate step (no `migrate` script exists in `package.json`). Left Next standalone output alone — enabling it needs a real Docker build to verify and is a bigger change than this pass warrants.
- [x] **`deploy.yml` TODO** — fixed in the deploy-overhaul rework: jobs are now `quality` + `deploy`, environment selection is `environment: ${{ github.ref_name }}` (branch name == GitHub Environment name), secrets are assembled into `.env` on the runner and streamed over SSH stdin (no more secret interpolation into remote script text), rsync got a proper exclude list (no `--delete` — the user hand-edits files on the server, esp. stg; stale repo-deleted files therefore linger until cleaned manually), and the deploy is gated by typecheck + unit tests, an in-container HTTP health check, and public-URL smoke tests. `DB_PORT`/`DB_NAME` env vars were dropped (unused) — delete them from the GitHub Environments too.
- [ ] **Pin `packageManager` in `package.json`** — CI pins pnpm 11 via `pnpm/action-setup`; adding `"packageManager": "pnpm@11.x"` would make CI/local/Docker resolve identically. Affects the Docker build's corepack resolution, so land it as its own change.
- [ ] **Compose healthcheck for the payload service** — the deploy workflow polls with `docker exec ... wget`; a proper `healthcheck` + `docker compose up --wait` would be cleaner and also inform `restart` behavior.
- [ ] **Buildx legacy guard in `deploy.yml`** — the `docker buildx use default` / `rm sookelive-builder` lines only exist because of a stale builder left on the server; delete them once confirmed gone (`docker buildx ls` on the server).
- [x] **`bin/mongodump.sh` vs `bin/backup-db.sh`** — deleted `mongodump.sh`; `backup-db.sh` already fully supersedes it (proper flags/quoting, `set -euo pipefail`, reads creds from `.env`, has a restore counterpart).

## Polish

- [x] **Typo "Coummunity"** — fixed in `generateTitle` in `src/plugins/index.ts` (both occurrences, same line).
- [x] **Leftover debug noise** — removed the commented-out `console.log`s in `src/stream/azuracast/api.ts`; `syncAzuracast.ts` now uses `req.payload.logger.info`/`.error` instead of `console.log`/`console.error`.
- [x] **`payload-docs.md` (repo root, ~15 KB)** — moved to `docs/payload-docs.md` (user confirmed: keep as reference, don't delete).
- [x] **`db/` backups directory** — added `db/` to `.gitignore`.
- [x] **`.gitignore` vs tracked env files** — replaced blanket `.env.*` with explicit `.env`, `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`; tracked `.env.example`/`.env.stg`/`.env.prd` are unaffected.
