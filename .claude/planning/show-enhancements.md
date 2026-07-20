# show enhancements

## requirements overview

This goal for this plan is to add new features to Show pages on the Sooke.live website:

- Add a new user auth group for hosts that will allow hosts to register and log in to edit their own show pages.
  - 'host' users should align with existing host names collection.
  - each 'host' can be assigned to one or more shows that they will be able to manage
- Add a sub-collection for 'episodes' of shows:
  - episodes will show as 'cards' in the same way that blog posts and shows do now, and will have the following properties:
    - image
    - title
    - date aired (the date the episode show aired, or will air)
    - date published (this post)
    - description
    - audio file or embedded audio: we will need to decide how to handle this
      - store in s3, and playback with a custom player: i already have s3 storage, but it is not wired up to this site
      - embed from mixcloud: this has been tested and working at the 'show' level, but i was not happy with the UI. It would work better with single episodes, but would require a subscription and an extra service, so s3 is preferable if we can do it.
    - tracklist

### decisions (confirmed)

- Host accounts are **created by an admin**; the host gets an email to set their password (no open registration).
- Hosts edit via the **Payload admin panel** (row-level access + hidden collections), not a custom frontend.
- Audio storage is **Wasabi S3**, served via direct public bucket URLs (native range requests → seeking works).
- Episodes get **their own public pages** (`/episodes/[slug]`) plus cards on the parent show page.
- The roles system must be **extensible** — more roles than admin/host later, cheaply.

Key codebase facts (verified): no roles concept exists anywhere; `Hosts` has no link to `Users`; `Shows.hosts` (hasMany relationship) already exists; `Card`/`CollectionArchive` are reusable once `'episodes'` joins the `relationTo` union; no S3 adapter is installed (`payload.config.ts` still has starter `storage-adapter-placeholder` comments); the existing `StreamPlayer` is live-stream-specific and won't be reused wholesale.

## implementation plan

### Phase 1 — Roles foundation (no access-behavior change; zero lockout risk)

1. **`src/access/roles.ts` (new)** — central role registry:
   - `ROLES = { admin: 'admin', host: 'host' } as const`, `type Role`, `roleOptions` derived from it, `hasRole(user, role)`, `isAdminUser(user)`. Future roles = add one key here.
2. **`src/collections/Users/index.ts`** — add `roles` field:
   - `select`, `hasMany: true` (array-from-day-one so future multi-role users need no data migration), `required`, `defaultValue: ['host']` (least privilege), `saveToJWT: true`, `options: roleOptions`, sidebar.
   - Field-level access `create/update: isAdminField` — blocks self-escalation even via REST PATCH. (Payload gotcha: field access is boolean-only, no where clauses.)
3. **`src/access/byRole.ts` (new)** — `isAdmin` (Access), `isAdminField` (FieldAccess), `isAdminOrSelf` (admin → true, else `{ id: { equals: user.id } }`), `isAdminOrHost`.
4. **Backfill** — `src/scripts/backfill-user-roles.ts`, run with `pnpm payload run …`: set `roles: ['admin']` on every user missing roles. Idempotent; run locally and on the server post-deploy.
5. `pnpm generate:types`. All existing collection access stays `authenticated` in this phase — nobody can be locked out.

### Phase 2 — Host↔User link + role-based access everywhere

1. **Link direction: `Users.host`** — relationship → `hosts`, admin-only field access, sidebar. Rationale: `req.user` then carries the host id into every access function with zero extra queries, and it avoids leaking user ids through the publicly-readable `hosts` collection.
2. **Show assignment = the existing `Shows.hosts` array** (no new field). Access where-clause: `{ hosts: { in: [hostId] } }` — a flat same-collection relationship query, safe in access functions.
3. **`src/access/assignedShows.ts` (new)**:
   - `getAssignedShowIds(req)` — finds shows where `hosts in [user.host]`, memoized on `req.context` per request.
   - `isAdminOrShowHost` (Shows update): admin → true; host → `{ hosts: { in: [hostId] } }`.
   - `isAdminOrEpisodeOfAssignedShow` (Episodes update/delete): admin → true; host → `{ show: { in: assignedShowIds } }` (pre-queried ids rather than a nested `show.hosts` path — deterministic against drafts/versions queries).
   - Documented caveat: `Shows.hosts` doubles as editorial credit and permission grant; if that ever becomes wrong, add a separate `managers` field without changing helper call sites.
4. **Users `access.admin`**: `hasRole(user,'admin') || hasRole(user,'host')` — hosts can enter `/admin`; role-less/anonymous cannot.
5. **Per-collection access matrix** (enforcement = access functions; `admin.hidden: ({ user }) => !isAdminUser(user)` is UI decluttering only):
   - **users**: create/delete `isAdmin`; read/update `isAdminOrSelf` (roles + host fields locked by field access). Hidden from hosts (self-edit via `/admin/account`).
   - **pages, posts, categories, genres**: mutations `isAdmin`; read unchanged public behavior (swap `authenticated` → `isAdmin` inside the published-or check, i.e. new `isAdminOrPublished` where drafts are involved; `anyone` read stays for categories/genres). Hidden from hosts.
   - **shows**: read — admin all; host `{ or: [{ hosts in [hostId] }, { _status: published }] }`; anon published-only. update `isAdminOrShowHost`; create/delete `isAdmin`. **Field-level `access.update: isAdminField` on `hosts`, `stream_playlist`, `streamer_id`, `authors`** (hosts can't grant access or break Azuracast wiring). Visible to hosts.
   - **episodes** (new): create `isAdminOrHost` (+ ownership hook, below); read same composed shape as shows; update/delete `isAdminOrEpisodeOfAssignedShow`. Visible to hosts.
   - **media**: create `isAdminOrHost` (hosts upload episode images via drawers — hidden collections still work in drawers); read `anyone`; update/delete `isAdmin`. Hidden from hosts.
   - **episode-audio** (new): create `isAdminOrHost`; read `anyone`; update/delete admin or own upload (`{ uploadedBy: { equals: user.id } }`). Hidden from hosts.
   - **hosts**: update — admin or own profile (`{ id: { equals: user.host } }`); create/delete `isAdmin`; read `anyone`. Visible to hosts.
   - **playlists**: already locked (`() => false` writes); hide from hosts.
   - **plugin collections** (redirects, forms, form-submissions, search): via `src/plugins/index.ts` overrides — mutations `isAdmin`, hidden from hosts.
6. Ship together with the access-matrix int tests (Phase 7). Pre-deploy check: no user docs missing `roles`.

### Phase 3 — Episodes + EpisodeAudio collections

1. **`src/collections/EpisodeAudio.ts` (new)** — upload collection, slug `episode-audio`: `mimeTypes: ['audio/*']`, no imageSizes/focalPoint; fields `title`, `uploadedBy` (relationship → users, readOnly, set via beforeChange on create). Temporary local `staticDir` until Phase 4.
2. **`src/collections/Episodes/index.ts` (new)** — modeled on `src/collections/Posts/index.ts`:
   - Fields: `title` (required); Content tab: `image` (upload → media), `description` (richText, Posts' lexical feature set), `audio` (upload → episode-audio, optional so drafts can precede audio), `tracklist` (array of `artist` req, `title` req, `startTime` optional text e.g. "1:23:45"); SEO tab: same `meta` group as Posts (plugin-seo fields) so `Card`/`generateMeta` work unchanged.
   - Sidebar: `show` (relationship → shows, **required, indexed**, `filterOptions` scoping the picker to assigned shows for hosts), `dateAired` (date, required, dayAndTime — may be future), `publishedAt` (Posts' auto-set beforeChange hook), `slugField()` with `unique: true` ("Episode 12" collides across shows).
   - `defaultPopulate`: `{ title, slug, show, dateAired, meta: { image, description } }` (Card-compatible).
   - Versions/drafts identical to Posts (autosave 100ms, schedulePublish, maxPerDoc 50); livePreview/preview via `generatePreviewPath`.
   - **Hooks**:
     - `hooks/enforceShowOwnership.ts` (beforeValidate): non-admin host + `data.show` not in `getAssignedShowIds(req)` → throw Forbidden. (Why a hook: Payload probes `create` access without `data` for UI buttons, so data-dependent create access would hide the Create button; the hook also blocks re-pointing an episode at someone else's show on update.)
     - `hooks/revalidateEpisode.ts` (afterChange/afterDelete, modeled on `revalidateShows.ts`): revalidate `/episodes/[slug]`, the parent show's `/shows/[showSlug]` (fetch show slug at depth 0), tags `episodes` + `episodes-sitemap`; honor `context.disableRevalidate`.
3. Register `Episodes, EpisodeAudio` in `src/payload.config.ts` collections array; add `episodes: '/episodes'` to `collectionPrefixMap` in `src/utilities/generatePreviewPath.ts` (note: `shows` is missing from that map today — add it too while there).
4. `pnpm generate:types` (commit the churn in the same commit).

### Phase 4 — Wasabi S3 for episode audio

1. **Keep `media` on local disk** (sharp-derived image sizes served statically; no migration benefit; Wasabi egress policy makes it wrong for site images). Only episode audio moves.
2. `pnpm add @payloadcms/storage-s3@^3.67` (**pin to the same minor as other `@payloadcms/*` deps**).
3. **`src/payload.config.ts`** — replace both placeholder comments:
   ```ts
   s3Storage({
     collections: {
       'episode-audio': {
         prefix: 'episode-audio',
         disablePayloadAccessControl: true, // direct bucket URLs → native Range requests → seeking
         generateFileURL: ({ filename, prefix }) => `${process.env.S3_PUBLIC_URL}/${prefix}/${filename}`,
       },
     },
     acl: 'public-read',
     bucket: process.env.S3_BUCKET || '',
     config: {
       credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
       region: process.env.S3_REGION,           // e.g. us-west-1
       endpoint: process.env.S3_ENDPOINT,       // https://s3.<region>.wasabisys.com
       forcePathStyle: true,
     },
   })
   ```
   `S3_PUBLIC_URL` = `https://s3.<region>.wasabisys.com/<bucket>`. Gotchas: `disablePayloadAccessControl` makes file bytes public regardless of collection read access (nothing private ever goes in this collection); bucket needs public-read policy; CORS only needed if the waveform/AudioContext path is added later; set an upload size cap (`upload.limits.fileSize` ~300MB) and confirm the Caddy proxy allows matching body sizes.
4. **Env/deploy**: add `S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/S3_REGION/S3_ENDPOINT/S3_PUBLIC_URL` to `.env.example`; add the two credential secrets to the `.secrets/.env` write step in `.github/workflows/deploy.yml` (lines ~43–48); non-secret values go in `.env.stg`/`.env.prd`. (Bucket policy + GitHub secrets are manual setup steps — flag in PR description.)

### Phase 5 — Frontend: pages, cards, sitemap, player

1. **URL scheme: flat `/episodes/[slug]`** — `Card` builds `/${relationTo}/${slug}`, so flat URLs make every integration a one-line union extension; uniqueness enforced by the slug field.
2. **`src/app/(frontend)/episodes/[slug]/page.tsx` (new)** — copy the posts/shows page shape: `generateStaticParams` (published, `overrideAccess: false`), cached `queryEpisodeBySlug` + draftMode, `PayloadRedirects`, `LivePreviewListener`, `generateMeta`. Render image, title, show back-link, formatted `dateAired`, RichText description, `<EpisodePlayer/>`, tracklist table (startTime → seek button is optional nice-to-have). Optionally add an `/episodes` archive index (cheap — include it).
3. **`src/app/(frontend)/shows/[slug]/page.tsx`** — query published episodes of the show (`sort: '-dateAired'`, limit 12, `overrideAccess: false`) and render `<CollectionArchive posts={episodes} relationTo="episodes"/>`. Freshness via `revalidateEpisode`.
4. **Card/Archive**: widen `relationTo` union to include `'episodes'` in `src/components/Card/index.tsx` + `src/components/CollectionArchive/index.tsx`; extend `src/blocks/ArchiveBlock/config.ts` options and `Component.tsx` fetch branch.
5. **Sitemap**: new `src/app/(frontend)/(sitemaps)/episodes-sitemap.xml/route.ts` (copy posts one, tag `episodes-sitemap`); register in `next-sitemap.config.cjs`.
6. **Single-audio-source coordination**: new minimal client context `src/providers/AudioSource/index.tsx` (`activeId`, `claim(id)`), wired into `src/providers/index.tsx`. Any player claims on play and pauses itself when another id claims — episode playback pauses the live stream and vice versa.
7. **`src/components/EpisodePlayer/index.client.tsx` (new)** — Howler player: `html5: true` (**critical** — streams via `<audio>` with native Range-request seeking instead of full-file WebAudio download), `preload: 'metadata'`; state idle/loading/playing/paused; position via rAF loop reading `sound.seek()`; `<input type="range">` seek bar (local state while dragging, `sound.seek(v)` on release); mm:ss elapsed/total; `sound.unload()` on unmount (no 30s-pause unload — that's a live-stream behavior). Claims `episodeId` in the AudioSource context.
8. **`src/stream/player/index.client.tsx`** — minimal touch: `claim('live')` on play, pause when another id claims. Everything else untouched. Waveform on episodes is a deferred follow-up (needs CORS + crossOrigin).

### Phase 6 — Host onboarding email

1. **Use the built-in forgot-password flow as the "set your password" email** (no `auth.verify` — it confirms email but doesn't set a password and adds a blocked-login state).
2. `src/collections/Users/index.ts` `auth.forgotPassword`: expiration 7 days (default 1h is too short for onboarding); custom `generateEmailSubject`/`generateEmailHTML` — "An account was created for you on Sooke.live — set your password", link `${getServerSideURL()}/admin/reset/${token}`. One template worded "set or reset" covers both flows.
3. **`src/collections/Users/hooks/sendWelcomeEmail.ts` (new, afterChange)**: on `operation === 'create'`, call `req.payload.forgotPassword({ collection: 'users', data: { email } })`. Guard with `context.skipWelcomeEmail` (tests/scripts), try/catch so SMTP failure never fails user creation (log it). SMTP is already configured via the nodemailer mailer plugin.
4. Admin workflow (document in PR): create user with throwaway password → set roles `['host']` + `host` profile → ensure the host doc is on the right Shows' `hosts` list. Lost email → login page's "Forgot password?" resends.

### Phase 7 — Testing & verification

**Int tests** (harness: `tests/int/helpers/payload.ts`; model: `tests/int/access.int.spec.ts`). Every assertion path uses `overrideAccess: false` + `user` (Local API bypasses access by default — the classic gotcha; seeding intentionally uses the bypass).

New `tests/int/hostAccess.int.spec.ts` — seed hostDocA/B, showA/B, adminUser, hostUserA. Assert:
- host reads only assigned show (+ published others); can update showA, not showB
- host's edits to `hosts`/`stream_playlist`/`streamer_id` on showA are stripped (field access strips silently — assert unchanged)
- host creates episode on showA ✓ / showB ✗ (Forbidden); can't re-point an episode to showB; update/delete scoped
- host can't touch posts/pages/other users; **self-escalation test**: `roles: ['admin']` patch on self is stripped
- anonymous sees published episodes only; admin retains everything

Unit specs for `src/access/*.ts` pure helpers. Optional `episodesRevalidate.int.spec.ts` mirroring `revalidateHooks.int.spec.ts`.

**Manual verification**
1. Backfill script → existing login still fully admin.
2. Create host user → set-password email arrives (local SMTP catcher) → log in → nav shows only Shows/Episodes/Hosts, only assigned show; create episode with image+audio via drawers.
3. Upload a real large MP3 → object lands in Wasabi under `episode-audio/`; `curl -I -H "Range: bytes=1000-2000" <url>` → 206.
4. Episode page: play, scrub (Range requests in network tab); starting live stream pauses episode and vice versa.
5. Publish episode → show page, `/episodes/[slug]`, sitemap all revalidate.
6. `pnpm typecheck && pnpm test:unit && pnpm test:int && pnpm build`.

### Ordering & risks

| # | Phase | Risk / mitigation |
|---|---|---|
| 1 | Roles field + helpers + backfill | Lockout impossible (access unchanged); backfill idempotent, run on server post-deploy |
| 2 | Access matrix + Users.host | Verify no role-less users before deploying; `admin.hidden` is cosmetic — tests target access fns |
| 3 | Episodes + EpisodeAudio | `generate:types` churn (commit together); add episodes (and missing shows) to `generatePreviewPath` map |
| 4 | Wasabi wiring | Version-match the adapter; public bucket is by design; proxy body-size for big uploads; dev files from Phase 3 need re-upload |
| 5 | Frontend + player | `html5: true` mandatory for seek; touch StreamPlayer only for claim/pause |
| 6 | Onboarding email | 7-day token; SMTP failure must not abort user creation |

Each phase leaves the app deployable. Development on a feature branch off `main`; no pushes to protected branches.
