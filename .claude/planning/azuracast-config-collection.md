# Azuracast config in the admin panel

## Goal

Move Azuracast configuration (base URL, station ID, API key, stream enabled/disabled
flag) out of `.env` files and into a Payload-managed settings doc that site admins can
edit from `/admin`, rather than requiring a redeploy to change.

## Decisions (confirmed)

- **Data shape: Global, not Collection.** One Azuracast instance for the whole site —
  a singleton settings doc under Settings in the admin sidebar, same pattern as
  `src/Header/config.ts` / `src/Footer/config.ts` (`getCachedGlobal` + a
  `revalidate*` hook on `afterChange`). A true Collection would add list/create/delete
  UI for a value where only one row is ever meaningful.
- **API key security: encrypt at rest.** AES-256-GCM keyed from `PAYLOAD_SECRET`,
  via `beforeChange`/`afterRead` field hooks, so the value in MongoDB is never
  plaintext. Decrypt only server-side when calling Azuracast. Restrict the global's
  `read`/`update` access to `authenticated` (no anonymous read of the global at all —
  simpler than trying to hide just one field from an otherwise-public global).

## Open question — refactor scope (not yet decided, holding this feature for now)

Two of the four values currently used are read directly in **browser** code via
`NEXT_PUBLIC_*` env vars baked in at build time:

- `NEXT_PUBLIC_AZURACAST_URL` — `src/stream/azuracast/nowplaying.tsx` computes
  `NOWPLAYING_WS_URL` from it once at module load, to open a WebSocket directly from
  the browser to Azuracast.
- `NEXT_PUBLIC_STREAM_DISABLED` — read directly in
  `src/Header/Component.client.tsx` to decide whether to render `<StreamPlayer>`.

Two options when this gets picked back up:

1. **Full refactor** — thread URL/station/enabled-flag from the DB through server
   components into client components as props (same shape as Header/Footer already
   use), so admin changes apply on next page load with no rebuild/redeploy.
2. **Server-only for this pass** — move URL/station/API key/enabled-flag into the
   global for server-side use only (Azuracast REST calls, playlist sync). Leave
   `NEXT_PUBLIC_AZURACAST_URL` / `NEXT_PUBLIC_STREAM_DISABLED` env vars in place for
   the client-side player/WebSocket. Smaller change, but leaves two sources of truth
   for those two values until a later pass.

### Impact notes for whichever option is picked

**Client-side (only relevant for option 1):**
- `nowplaying.tsx` is not a React component — it's a plain module holding one
  singleton WebSocket shared across all subscribers (`listeners: Set`), with the URL
  computed once at import time. Making the URL runtime-configurable means
  `connectToWebSocket` needs to take the URL as an argument (or a one-time
  `configure()` call) instead of reading a module-level constant. This is the one
  non-trivial code change in the whole feature.
- No security change either way from doing this: the browser must know the Azuracast
  URL to open the WebSocket directly, so it was never actually secret — it just moves
  from "baked into the bundle" to "fetched at render time." The API key stays
  server-only regardless of which option is picked.
- A tab that's already open won't pick up a changed URL until it reloads — true today
  with env+redeploy too, so no regression either way.

**Server-side (`src/stream/azuracast/api.ts`), relevant either way:**
- `azuracastAPI` currently reads `process.env` synchronously at call time. Once
  config lives in the DB, every call becomes async (fetch the global first, e.g. via
  `getCachedGlobal`-style caching so we're not hitting Mongo on every Azuracast
  request). Every caller needs updating: `src/collections/Playlists/syncPlaylists.ts`,
  and transitively the `/api/playlists/sync` endpoint and `sync-azuracast` job task.

**Testing:**
- `tests/int` currently points the mock Azuracast server via `AZURACAST_URL` /
  `AZURACAST_STATION_ID` env vars (see the comment in `src/stream/azuracast/api.ts`).
  Moving config to the DB means integration tests need to seed the `azuracast` global
  instead (or keep an env-var override path for tests specifically).

**Operational gotcha (real, not hypothetical) — encrypted key + `sync-prd-to-stg.sh`:**
- `bin/sync-prd-to-stg.sh` does a raw `mongodump`/`mongorestore` of prd's database
  into stg, bypassing Payload and all app-level hooks entirely.
- If the API key is encrypted at rest using `PAYLOAD_SECRET` as the key (the
  confirmed approach above), and prd/stg have different `PAYLOAD_SECRET` values (as
  they should), a prd→stg sync will copy over an encrypted value that stg's
  `PAYLOAD_SECRET` cannot decrypt — silently breaking the Azuracast integration on
  stg until someone re-enters the key by hand in the admin panel.
- Needs a decision when implemented: document it as a known step in the sync runbook
  (re-enter the Azuracast key on stg after a prd→stg sync), or find another way to
  flag/handle it (e.g. the decrypt failure should error loudly rather than silently
  producing garbage, so it's obvious rather than a confusing runtime failure).

## Verified codebase facts (as of 2026-07-20)

- Existing env vars: `AZURACAST_URL`, `AZURACAST_STATION_ID`, `AZURACAST_KEY`,
  `NEXT_PUBLIC_AZURACAST_URL`, `NEXT_PUBLIC_AZURACAST_STATION_ID`,
  `NEXT_PUBLIC_STREAM_DISABLED`.
- No existing precedent in this codebase for encrypting secrets at rest in Payload —
  SMTP credentials (`src/plugins/mailer.ts`) stay in env, unencrypted, for comparison.
- `Users` collection has no roles field — every authenticated user already has full
  admin access, so "editable by site admins" maps directly to the existing
  `authenticated` access helper (`src/access/authenticated.ts`), no new RBAC needed.
- Header/Footer globals only set `access.read`; `create`/`update`/`delete` are left at
  Payload's default (`() => true`, i.e. open) — the new Azuracast global must
  explicitly set `access.update` (and probably `access.read`) to `authenticated`
  rather than following that same pattern, since it will hold a secret.

## Status

Deferred — user is holding onto this change for now. Revisit the refactor-scope
question above before starting implementation.
