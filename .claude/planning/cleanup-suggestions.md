# Cleanup suggestions

Running list of cruft found in the codebase (2026-07-07 audit). Fix these opportunistically when working in the affected area; check items off as they land.

## Quick deletions

- [ ] **`51.222.13.157` (repo root)** — accidental untracked file: it's a byte-for-byte copy of `bin/backup-db.sh`, almost certainly created by a shell redirect/scp typo where the server IP became a filename. Safe to delete; do not commit.
- [ ] **`Dockerfile-bkp`** — stale backup of the old Dockerfile. Git history already preserves it.
- [ ] **`yarn.lock`** — project uses pnpm (`pnpm-lock.yaml`, `.npmrc`, `pnpm.overrides`). The stale yarn lockfile invites installing with the wrong tool.
- [ ] **`src/app/(frontend)/next/exit-preview/GET.ts`** — duplicate of `route.ts` in the same directory; only `route.ts` is used by the App Router.
- [ ] **Template boilerplate** — `BeforeLogin`/`BeforeDashboard` admin components and their config comments in `payload.config.ts` are from the Payload website template; remove if the welcome blocks aren't wanted.
- [ ] **`claude.md` (repo root, lowercase)** — stray duplicate of `CLAUDE.md` with older/different content (predates the current one). Confirmed genuinely different via `diff`, not a case-insensitive-filesystem artifact. Safe to delete once confirmed nothing references the lowercase path.

## Correctness / security

- [x] **`POST /api/playlists/sync` is unauthenticated** — fixed in the `cc-automated-testing` branch: requires `req.user` or `Authorization: Bearer $CRON_SECRET` (same pattern as the jobs `run` access check in `payload.config.ts`), verified with a live 401/200 check and locked in with an integration test.
- [x] **`syncAzuracast` task's sync logic duplicated the endpoint's** — fixed: extracted into `syncPlaylists()` (`src/collections/Playlists/syncPlaylists.ts`), used by the endpoint. The task **still** calls the endpoint over HTTP, though - turns out that's load-bearing, not cruft: `Playlists`' `afterChange`/`afterDelete` hooks call `revalidatePath`/`revalidateTag`, which require a real Next.js request-scoped store. An earlier version of this fix had the task call `syncPlaylists()` directly (no HTTP hop), which looked like a clean simplification but made the cron job throw and fail on every run, since a plain `Cron`/`setTimeout` callback has no such context. Caught by a code-review sub-agent verifying against `next`'s actual source (`workAsyncStorage`/`revalidate.js`) before merging, not by the test suite - see the automated-testing.md test-gap note this added.
- [ ] **Cron comment mismatch** — `payload.config.ts` schedules `'*/15 * * * *'` with the comment "every hour at minute 0". Decide which cadence is intended and fix the other.
- [x] **Hard-coded Azuracast base URL** — fixed in the `cc-automated-testing` branch: now built from `AZURACAST_URL`/`AZURACAST_STATION_ID`, falling back to the `NEXT_PUBLIC_` vars and then the old hardcoded value.
- [x] **`syncPlaylists` wiped all local playlists if Azuracast returned an empty array** — fixed: `syncPlaylists()` now short-circuits on a zero-length response, logs a warning via `payload.logger.warn`, and returns `{ warning, results: [] }` without deleting anything; the `/sync` endpoint passes `warning` through in its JSON response. Locked in with integration tests.

## Docker / deploy

- [ ] **Dockerfile dead lines** — `RUN NODE_ENV=production` is a no-op (sets a var in a throwaway shell); `EXPOSE $EXPOSE_PORT` references an undefined ARG; the commented-out migrate step and the `COPY . /app` in the *base* stage (defeats layer caching for installs) are worth revisiting. Also revisit Next standalone output, which the header comment says is disabled — it would shrink the runtime image a lot.
- [x] **`deploy.yml` TODO** — fixed in the deploy-overhaul rework: jobs are now `quality` + `deploy`, environment selection is `environment: ${{ github.ref_name }}` (branch name == GitHub Environment name), secrets are assembled into `.env` on the runner and streamed over SSH stdin (no more secret interpolation into remote script text), rsync got a proper exclude list (no `--delete` — the user hand-edits files on the server, esp. stg; stale repo-deleted files therefore linger until cleaned manually), and the deploy is gated by typecheck + unit tests, an in-container HTTP health check, and public-URL smoke tests. `DB_PORT`/`DB_NAME` env vars were dropped (unused) — delete them from the GitHub Environments too.
- [ ] **Pin `packageManager` in `package.json`** — CI pins pnpm 11 via `pnpm/action-setup`; adding `"packageManager": "pnpm@11.x"` would make CI/local/Docker resolve identically. Affects the Docker build's corepack resolution, so land it as its own change.
- [ ] **Compose healthcheck for the payload service** — the deploy workflow polls with `docker exec ... wget`; a proper `healthcheck` + `docker compose up --wait` would be cleaner and also inform `restart` behavior.
- [ ] **Buildx legacy guard in `deploy.yml`** — the `docker buildx use default` / `rm sookelive-builder` lines only exist because of a stale builder left on the server; delete them once confirmed gone (`docker buildx ls` on the server).
- [ ] **`bin/mongodump.sh` vs `bin/backup-db.sh`** — overlapping purpose; `mongodump.sh` has a typo ("taekes"), no `set -e`, and unquoted args. Fold it into `backup-db.sh` or delete it.

## Polish

- [ ] **Typo "Coummunity"** — in `generateTitle` in `src/plugins/index.ts` (twice); this string ends up in every page's SEO title.
- [ ] **Leftover debug noise** — commented-out `console.log`s in `src/stream/azuracast/api.ts`, `src/plugins/mailer.ts`, and `console.log`s in `src/tasks/syncAzuracast.ts`; prefer `req.payload.logger`.
- [ ] **`payload-docs.md` (repo root, ~15 KB)** — pasted reference docs. Move under `docs/` or delete if it just mirrors payloadcms.com.
- [ ] **`db/` backups directory** — empty and untracked but not in `.gitignore`; add `db/` so a database dump is never accidentally committed.
- [ ] **`.gitignore` vs tracked env files** — `.env.*` is ignored, yet `.env.example`, `.env.stg`, and `.env.prd` are tracked (added before/despite the rule) and the deploy workflow depends on the branch files. Replace the blanket `.env.*` with explicit ignores (e.g. `.env`, `.env.local`) so the intent is clear and changes to the tracked files aren't silently masked in some tools.
