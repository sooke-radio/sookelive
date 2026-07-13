# Automated testing

## Goal

Get the repo from zero tests to a CI-gated test suite so that dependency bumps, Payload upgrades, and feature work can be verified automatically instead of by clicking around stg. Target: every PR runs lint + typecheck + unit/integration tests; e2e smoke runs before anything reaches `prd`.

## Approach

Follow the official Payload 3 website template's testing setup (this repo was forked from it, so the shape fits): **Vitest** for unit/integration and **Playwright** for e2e, with tests under `tests/int/` and `tests/e2e/` plus colocated `*.spec.ts` for pure utilities.

### Phase 0 — prerequisites (refactors that block testability)

These come from `cleanup-suggestions.md` and must land first because the code can't be exercised in isolation as written:

1. **Extract the playlist sync logic** out of the `POST /api/playlists/sync` endpoint handler (`src/collections/Playlists/index.ts`) into a `syncPlaylists(payload)` function, used by the endpoint and directly unit/integration-testable. ~~Both the endpoint and the `syncAzuracast` task call it directly — no more self-HTTP via `NEXT_PUBLIC_SERVER_URL`~~ **Correction, found during implementation**: the task still calls the endpoint over HTTP. That self-HTTP hop isn't cruft - it's the only way the sync runs inside a real Next.js request context, which `Playlists`' revalidate hooks (`revalidatePath`/`revalidateTag`) require to not throw. A cron-driven job task has no such context. Calling `syncPlaylists()` directly from the task looked like a clean simplification but broke the cron sync on every run; caught by a code-review sub-agent reading `next`'s source, not by this test suite (see Phase 2's test-gap note below).
2. **Make the Azuracast client configurable**: `src/stream/azuracast/api.ts` must build its base URL from `AZURACAST_URL` + `AZURACAST_STATION_ID` instead of the hard-coded production URL, so tests can point it at a mock server.
3. **Add a `typecheck` script** (`tsc --noEmit`) — there is currently no typecheck outside `next build`.

### Phase 1 — unit tests (Vitest, no DB)

- Add `vitest` + `@vitest/coverage-v8`; config with the `@/*` path alias from `tsconfig.json`.
- First targets, all pure and currently untested:
  - `src/utilities/` — `deepMerge`, `toKebabCase`, `formatDateTime`, `formatAuthors`, `getURL`, `generateMeta`
  - `src/schedule/schedule-common.ts` — schedule parsing/ordering logic (the most bug-prone radio-specific code)
  - `src/stream/player/getShowSlug.ts`
- Script: `pnpm test:unit` → `vitest run`.

### Phase 2 — integration tests (Vitest + real Payload + MongoDB)

- Boot Payload via `getPayload({ config })` against an ephemeral Mongo: use `mongodb-memory-server` locally and a `mongo` service container in CI (memory-server also works in CI; pick one and stick with it).
- Mock Azuracast HTTP with **msw** (fixtures: playlist list, now-playing payload, schedule items).
- Targets:
  - `syncPlaylists()` — creates new playlists, updates existing by `az_id`, deletes ones removed upstream (the `not_in` delete is destructive and deserves the first test).
  - Access control — `Playlists` is read-only via API; `authenticatedOrPublished` behavior on Pages/Posts/Shows drafts.
  - Collection hooks — `revalidate*` hooks fire on publish (mock `next/cache`).
  - The `/api/playlists/sync` endpoint rejects unauthenticated requests **once auth is added** (regression-locks the security fix).
- Script: `pnpm test:int` → `vitest run --config vitest.int.config.ts` (separate config: node environment, longer timeouts, globalSetup that seeds the DB).
- **Known test gap**: `tests/int/setupFiles.ts` mocks `next/cache` globally (`revalidatePath`/`revalidateTag` throw outside a real Next.js request context, which every collection write hits via `afterChange`/`afterDelete` hooks). That mock is necessary for these tests to run at all under the Local API - but it also means this suite can never catch a bug where something calls those hooks from a context that *doesn't* have a real request scope (exactly the `sync-azuracast` job task regression described in Phase 0 item 1's correction). Phase 3's e2e suite runs a real `next start` server, so it's the one place that could catch this class of bug for real - see its item below.

### Phase 3 — e2e smoke (Playwright)

- Small suite, run against `pnpm build && pnpm start` with a seeded test DB and `NEXT_PUBLIC_STREAM_DISABLED=true` (Howler/audio is out of scope for CI).
- Smoke paths: home page renders, `/posts` and `/shows` list + detail pages, `/search` returns results, `/admin` login page loads, draft preview route round-trip.
- Add a path that exercises the `sync-azuracast` job task for real (e.g. trigger it via Payload's jobs REST endpoint with `Authorization: Bearer $CRON_SECRET`) against the real running server, asserting it completes without error - this is the only layer that can catch a regression like Phase 0 item 1's correction (revalidate hooks called outside real request context), since Phase 2 mocks `next/cache` entirely.
- Script: `pnpm test:e2e`; keep it under ~2 minutes.

### Phase 4 — CI wiring (GitHub Actions)

- New `.github/workflows/ci.yml`, triggered on PRs and pushes to `main`/`stg`/`prd`:
  1. `pnpm ii`
  2. `pnpm lint`
  3. `pnpm typecheck`
  4. `pnpm generate:types && git diff --exit-code src/payload-types.ts` — fails if committed types drifted from collection config
  5. `pnpm test:unit`, `pnpm test:int` (with Mongo service)
  6. `pnpm test:e2e` — only on `stg`/`prd` pushes and PRs labeled `e2e`, to keep PR feedback fast
- Gate deploys: add `needs`/reusable-workflow dependency so `deploy.yml` only runs after CI passes on the same commit (also resolves the deploy-consolidation TODO in `cleanup-suggestions.md`).

## Open questions

- `mongodb-memory-server` vs CI service container for integration tests — memory-server is simpler but downloads a Mongo binary per run; a service container matches prod (Mongo version pin) better.
- Do we want visual/regression coverage of the block renderer (`RenderBlocks`)? Playwright screenshots are cheap but flaky across font rendering; defer.
- Is there any way to test the live stream player beyond "component mounts with stream disabled"? Probably needs a stubbed Howler; low priority.
- Coverage thresholds: start reporting-only, revisit enforcing (~60% on `src/utilities` + `src/schedule`) once phases 1–2 land.

## Status

Planned 2026-07-07. Nothing implemented yet. Suggested order: Phase 0 + 1 in one PR (small, immediate value), Phase 2 next (highest value — protects the destructive sync path), then 4, then 3.
