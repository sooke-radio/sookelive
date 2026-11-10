# Import audio uploaded directly to S3 into Episode Audio

## Goal

Episode audio lives in a private Wasabi bucket under the `episode-audio/` prefix (`s3Storage`
plugin, `signedDownloads`). Files dropped straight into the bucket (rclone / aws cli / Wasabi
console) have no Payload `episode-audio` doc, so they can't be picked in the Episodes `audio`
upload field. Scan the bucket and register un-registered files as docs, **without re-uploading**,
so they appear for mapping. Browser uploads in the admin stay as they are (server-side, keeps
the MP3 Xing-header fix); no `clientUploads`.

## Findings that shape the design

Checked against Payload and `@payloadcms/storage-s3` 3.90.2 source:

- A doc is served from just `filename` (plus optional `prefix`): key = `episode-audio/<filename>`.
  `mimeType`/`filesize` are display-only.
- Payload core throws `MissingFile` on create with no file unless the collection sets
  `upload.filesRequiredOnCreate: false`. With it off, `filename`/`mimeType`/`filesize`/`prefix`
  in `data` pass through and the S3 plugin does no upload (no `req.file`).
- `filename` is `unique`, so re-running the import is naturally idempotent.
- Deleting an imported doc deletes its S3 object (plugin `afterDelete`), same as any doc.
- `@aws-sdk/client-s3` is not a direct dependency (pnpm strict layout); it must be added.
- The app IAM user has `s3:ListBucket` only for prefix `episode-audio/*`, so `ListObjectsV2`
  must pass `Prefix: 'episode-audio/'`.
- Episodes hooks call `revalidatePath`, which throws outside a Next request, so the cron path
  must go through the HTTP endpoint (same trick as `src/tasks/syncAzuracast.ts`).
- The `audio/*` mime allow-list is not enforced for file-less creates, so the importer must
  check types itself.

## Approach

Trigger: admin button **and** periodic cron job (both).

1. **Dependency**: add `@aws-sdk/client-s3` (pin to the version storage-s3 resolves, 3.1145.0 in
   the lockfile); update `pnpm-lock.yaml`.
2. **Importer** `src/collections/EpisodeAudio/importFromBucket.ts`: pure function taking the
   payload instance and an S3 client (so tests can stub it).
   - Build the client from the same `S3_*` env vars as `payload.config.ts` (`forcePathStyle: true`).
     No-op with a clear message if S3 is not enabled (dev without S3).
   - `ListObjectsV2` with `Prefix: 'episode-audio/'`, paginate on `NextContinuationToken`. Skip
     folder markers, keys with extra `/` segments, and non-audio extensions
     (mp3, m4a, aac, ogg, opus, wav, flac). Reject filenames containing `..`.
   - Look up existing `filename`s in batched queries and skip those.
   - For each new object: `payload.create({ collection: 'episode-audio', overrideAccess: true,
     data: { filename, prefix: 'episode-audio', mimeType, filesize } })`. `defaultTitleFromFilename`
     fills `title`; `uploadedBy` stays empty without a user. Per-file try/catch; return
     `{ imported, skipped, failed[] }`.
   - Imported MP3s do not get the Xing header (it would mean rewriting the object). Files
     uploaded outside the app skip that fix; document it.
3. **Collection change** `src/collections/EpisodeAudio.ts`:
   - `upload.filesRequiredOnCreate: false`.
   - `beforeValidate` guard: on `create` with no `req.file`, require `data.filename` and either an
     admin user or an importer context flag, so hosts can't create empty docs via API/admin.
4. **Endpoint** `POST /api/episode-audio/import-from-bucket` (collection endpoint, pattern from
   `src/collections/Playlists/index.ts`): `isAuthenticatedOrCronSecret` plus an `isAdminUser`
   check for logged-in users (cron secret bypasses). Returns `{ success, imported, skipped, failed }`.
5. **Admin button** `src/components/ImportFromBucket/index.tsx` (client component modeled on
   `src/components/RevalidateAll/index.tsx`), registered via `admin.components.beforeListTable`
   on EpisodeAudio. Shows a result toast with counts. Run `pnpm generate:importmap`.
6. **Cron job** `src/tasks/importEpisodeAudio.ts` modeled on `syncAzuracast.ts`: `fetch`es the
   endpoint with `Bearer CRON_SECRET`. Register in `jobs.tasks` and add an `autoRun` entry in
   `payload.config.ts` (own queue `import-episode-audio`, e.g. every 10 min). Existing
   `shouldAutoRun` applies unchanged.
7. **Types/docs**: `pnpm generate:types` (no field changes expected); update
   `archive/wasabi-storage-setup.md` with how to upload directly (key must be `episode-audio/<filename>`,
   then Scan bucket or wait for cron) and the stg-to-prd DB-sync caveat.

## Critical files

- `src/collections/EpisodeAudio.ts`, `src/payload.config.ts`
- New: `src/collections/EpisodeAudio/importFromBucket.ts`, `src/tasks/importEpisodeAudio.ts`,
  `src/components/ImportFromBucket/index.tsx`
- Reuse: `src/access/isAuthenticatedOrCronSecret.ts`, `src/access/roles.ts` (`isAdminUser`),
  `src/endpoints/revalidateAll.ts`, `src/components/RevalidateAll/index.tsx`,
  `src/tasks/syncAzuracast.ts`

## Security / review

- Endpoint requires admin or `CRON_SECRET`. The importer never accepts user-supplied keys (keys
  come only from listing the fixed prefix); reject `..` and `/` in filenames.
- No env values logged; S3 client built from env at call time.
- File-less create guard prevents hosts creating phantom docs.
- Document that deleting an imported doc removes its S3 object.

## Verification

- `pnpm test:int`: new `tests/int/importFromBucket.int.spec.ts` with a stubbed S3 client
  (paginated listing, folder marker, non-audio file, already-registered file, one failing key);
  assert the second run is idempotent and `title` defaults. Test the guard rejects a file-less
  create for a host.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`.
- Manual on stg: copy a test mp3 to `s3://srs-web-audio-stg/episode-audio/`, click **Scan bucket**,
  confirm the doc appears, select it in an Episode's `audio` field, play it on the episode page
  (302 to presigned URL). Confirm the cron picks up a second file within the interval; delete the
  test doc and confirm the object is removed.

## Open questions

- Cron interval (10 min proposed).
- Whether imported docs should get an `uploadedBy` (currently empty, so only admins can edit/delete them).

## Status

Deferred. Resume after the current episode-audio file-upload implementation is finished.
