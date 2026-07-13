# Cleanup suggestions

Running list of cruft found in the codebase (2026-07-07 audit). Fix these opportunistically when working in the affected area; check items off as they land.

## Quick deletions

- [ ] **`51.222.13.157` (repo root)** — accidental untracked file: it's a byte-for-byte copy of `bin/backup-db.sh`, almost certainly created by a shell redirect/scp typo where the server IP became a filename. Safe to delete; do not commit.
- [ ] **`Dockerfile-bkp`** — stale backup of the old Dockerfile. Git history already preserves it.
- [ ] **`yarn.lock`** — project uses pnpm (`pnpm-lock.yaml`, `.npmrc`, `pnpm.overrides`). The stale yarn lockfile invites installing with the wrong tool.
- [ ] **`src/app/(frontend)/next/exit-preview/GET.ts`** — duplicate of `route.ts` in the same directory; only `route.ts` is used by the App Router.
- [ ] **Template boilerplate** — `BeforeLogin`/`BeforeDashboard` admin components and their config comments in `payload.config.ts` are from the Payload website template; remove if the welcome blocks aren't wanted.

## Correctness / security

- [ ] **`POST /api/playlists/sync` is unauthenticated** — `src/collections/Playlists/index.ts` has the auth check commented out (`// TODO: authenticate user`). Anyone can trigger a sync that deletes/recreates playlist docs. Require `req.user` or the `CRON_SECRET` bearer token (the jobs runner in `src/tasks/syncAzuracast.ts` would then need to send it).
- [ ] **`syncAzuracast` task calls itself over HTTP** — it fetches `NEXT_PUBLIC_SERVER_URL + '/api/playlists/sync'` from inside the same process. Extract the sync logic into a shared function and call it directly from both the task and the endpoint; removes the HTTP round-trip, the env-var dependency, and the auth problem above.
- [ ] **Cron comment mismatch** — `payload.config.ts` schedules `'*/15 * * * *'` with the comment "every hour at minute 0". Decide which cadence is intended and fix the other.
- [ ] **Hard-coded Azuracast base URL** — `src/stream/azuracast/api.ts` hard-codes `https://stream.sooke.live/api/station/sookelive` even though `AZURACAST_URL` and `AZURACAST_STATION_ID` exist in the env files. Build the URL from env so stg/dev can point elsewhere.

## Docker / deploy

- [ ] **Dockerfile dead lines** — `RUN NODE_ENV=production` is a no-op (sets a var in a throwaway shell); `EXPOSE $EXPOSE_PORT` references an undefined ARG; the commented-out migrate step and the `COPY . /app` in the *base* stage (defeats layer caching for installs) are worth revisiting. Also revisit Next standalone output, which the header comment says is disabled — it would shrink the runtime image a lot.
- [ ] **`deploy.yml` TODO** — the workflow's own comment says "consolidate deploy workflows"; the single job is named `stg-deploy` but serves both stg and prd. Rename the job and parameterize cleanly.
- [ ] **`bin/mongodump.sh` vs `bin/backup-db.sh`** — overlapping purpose; `mongodump.sh` has a typo ("taekes"), no `set -e`, and unquoted args. Fold it into `backup-db.sh` or delete it.

## Polish

- [ ] **Typo "Coummunity"** — in `generateTitle` in `src/plugins/index.ts` (twice); this string ends up in every page's SEO title.
- [ ] **Leftover debug noise** — commented-out `console.log`s in `src/stream/azuracast/api.ts` and `console.log`s in `src/tasks/syncAzuracast.ts`; prefer `req.payload.logger`.
- [ ] **`payload-docs.md` (repo root, ~15 KB)** — pasted reference docs. Move under `docs/` or delete if it just mirrors payloadcms.com.
- [ ] **`db/` backups directory** — empty and untracked but not in `.gitignore`; add `db/` so a database dump is never accidentally committed.
- [ ] **`.gitignore` vs tracked env files** — `.env.*` is ignored, yet `.env.example`, `.env.stg`, and `.env.prd` are tracked (added before/despite the rule) and the deploy workflow depends on the branch files. Replace the blanket `.env.*` with explicit ignores (e.g. `.env`, `.env.local`) so the intent is clear and changes to the tracked files aren't silently masked in some tools.
