# Wasabi S3 storage for episode audio — remaining work & rollout plan

**Status: DONE (2026-11-10)** — confirmed complete by the user (rollout finished).

> **Revision 2 (2026-11-03): private bucket + signed downloads.** Anti-scraping decision: the buckets are NOT public. Files are served via Payload's `/api/episode-audio/file/<name>` route, which 302-redirects to a short-lived Wasabi presigned URL (`signedDownloads`, verified present in `@payloadcms/storage-s3@3.90.2`). Consequences, all reflected below: no public-read bucket policy; `disablePayloadAccessControl` and `generateFileURL` are removed; `S3_PUBLIC_URL` is no longer needed; Caddy rate-limits the file route. **Implemented 2026-11-05** in `payload.config.ts` (`signedDownloads: { expiresIn: 21600 }`; `S3_PUBLIC_URL`, `generateFileURL`, `disablePayloadAccessControl` removed). Reason it was forced: the Wasabi account returns `AccessDenied: Public use of objects is not allowed by this account` for any public object, so a public-read bucket policy cannot work (unless Wasabi support lifts it). Local curl verified: file route → 302 to presigned URL → `206` Range; unsigned URL → `403`. Still pending: Caddy rate limit, stg/prd server testing, browser player check. Note Payload's file route returns 404 to `HEAD`; use `GET` with a Range header when testing.
>
> **Revision 1 (2026-11-03):** separate buckets per environment (prd `srs-web-audio`, stg `srs-web-audio-stg`, no `S3_PREFIX`); build-time env issue resolved by a fail-fast guard; local-disk fallback is dev/test-only (production throws if any `S3_*` var is missing). prd → stg audio copying is documented as manual options (script unchanged). Sections below reflect all of this.

Branch: `cc-wasabi-uploads`. Implements Phase 4 of `show-enhancements.md`.

## Current state (from commit `b843a901` "wasabi-uploads wip")

Done in code:
- `@payloadcms/storage-s3@3.90.2` installed (pinned to match other `@payloadcms/*`).
- `src/payload.config.ts`: `s3Storage` for `episode-audio` only (media stays on local disk). `enabled` only when all `S3_*` vars are set; otherwise (dev/test only) it falls back to local disk (`public/episode-audio`, now gitignored). Under `NODE_ENV=production` missing vars throw at config load. *Currently* `disablePayloadAccessControl: true` + `generateFileURL` build direct public URLs (`S3_PUBLIC_URL/prefix/filename`); *to be replaced by `signedDownloads`* (see Anti-scraping design). `forcePathStyle: true`. Upload cap 300MB.
- `EpisodeAudio.ts` / `Episodes` no longer gated behind `AUDIO_UPLOADS_ENABLED`; the audio field is live.
- `.env.stg` / `.env.prd` hold the non-secret vars (`S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_PUBLIC_URL` *(to be removed)*); `.env.example` documents them (commented out).
- `deploy.yml` requires `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` GitHub secrets and writes them to `.secrets/.env`.

## Anti-scraping design (private bucket + signed downloads)

Why: a public-read bucket lets bots fetch any known URL straight from Wasabi with no rate limit, no logging, and a direct hit on the egress allowance. (Bots can't list the bucket, only crawl your pages.) Caveat: anything a browser can play can be saved by a determined person; this stops casual scraping and bounds cost.

Flow *(pending)*:
1. Page/player uses the stable URL `/api/episode-audio/file/<filename>` on the site domain (set by the plugin when `disablePayloadAccessControl` is off).
2. Payload runs collection `read` access (`anyone` today), then `getFile` returns `302` to a Wasabi presigned URL (default `expiresIn` 7200s).
3. The browser follows the redirect and makes Range requests directly to Wasabi, so seeking still works and audio bytes don't flow through the Node app.
4. The bucket has no public policy; direct URLs without a signature return 403.

Details to handle:
- **Expiry vs. long shows.** The media element keeps reusing the presigned URL for Range/seek requests; if a listener seeks after expiry it 403s. Use a generous `expiresIn` (e.g. `21600` = 6h, longer than any show) and optionally make the player re-request the file route on a media error.
- **`shouldUseSignedURL`** (optional hook in the same option object) can return `false` to stream through Payload instead, e.g. for specific callers.
- **Rate limiting** is the actual bot defence, since the stable URL is still crawlable. Apply it in Caddy to `/api/episode-audio/file/*` (Caddy's built-in has no rate limiter; needs the `caddy-ratelimit` plugin build, or use Cloudflare rules; check which the server's Caddy image has). Also consider blocking known bot UAs and `robots.txt` Disallow for `/api/`.
- **Optional access rules:** tighten `episode-audio` `read` access later (e.g. only attached to a published episode) if needed.
- **Optional CDN (Cloudflare)** in front of the site domain for bot management and cached egress; compatible with this design.

### Signed downloads: code changes *(pending)*
In `src/payload.config.ts` `s3Storage`:
```ts
collections: {
  'episode-audio': {
    prefix: 'episode-audio',
    signedDownloads: { expiresIn: 21600 },
    // remove: disablePayloadAccessControl, generateFileURL
  },
},
```
- Remove `S3_PUBLIC_URL` from `S3_REQUIRED_VARS`, `.env.stg`, `.env.prd`, `.env.example`.
- Confirm `EpisodeAudio` `read: anyone` and the `Episodes` frontend query resolve the audio `url` to the Payload route (check the EpisodePlayer's source URL and `generateStaticParams` output after `pnpm build`).
- Add a Caddy rate-limit block for `/api/episode-audio/file/*` to `Caddyfile.example` (and the server's real Caddyfile).
- Update/add a test: audio doc `url` starts with `/api/episode-audio/file/`.
- Then re-run the security review (public surface is now the file route + presigned links).


### Not code — manual setup
1. **Two Wasabi buckets** in `ca-central-1`: prd `srs-web-audio` (verify it exists) and stg `srs-web-audio-stg` (create).
2. **Keep both buckets private**: no public-read bucket policy (files are served through presigned URLs). Verify the Wasabi bucket has no policy/ACL granting public access.
3. **One least-privilege IAM user per bucket** (stg user cannot touch the prd bucket at all).
4. **GitHub secrets** `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. The deploy fails fast if they are missing. The names are shared by both branches, so use GitHub Environments (`stg`, `prd`) with distinct values, or add prd keys only at prd cut-over. Check how `deploy.yml` selects secrets today.
5. **Local `.env`** with the stg-user credentials and stg bucket for local testing.

### Done in this revision
- **Separate buckets:** `.env.stg` → `srs-web-audio-stg`; `.env.prd` → `srs-web-audio`. `S3_PREFIX` removed (fixed `episode-audio` prefix in config). Bucket isolation also removes the old risk of stg deleting prd objects.
- **Build-time env:** the earlier concern was that `S3_*` might be absent during `next build`. In fact the Dockerfile's `COPY . .` bakes the `.env` uploaded by deploy.yml (including the S3 secrets, same as the other secrets) into the build stage, so the vars are present at build. What was missing was a guarantee. `payload.config.ts` now throws if `NODE_ENV=production` and any of `S3_BUCKET/REGION/ENDPOINT/ACCESS_KEY_ID/SECRET_ACCESS_KEY` (`S3_PUBLIC_URL` is dropped once signed downloads land) is unset, so a build or start without S3 can never silently bake local `/api/...` audio URLs into static pages.
- **Local fallback is dev/test-only:** with the vars unset and `NODE_ENV!=production` the plugin is disabled and uploads go to `public/episode-audio` (now in `.gitignore`). Consequence: a local `pnpm build` / `pnpm dev:prod` needs the S3 vars set too.
- Not yet verified: `@payloadcms/storage-s3` isn't installed in this container's `node_modules` (pnpm binary fails with EACCES), so typecheck/build/tests have not been run. Run `pnpm ii` first.

### Still to decide / check
1. **prd → stg DB sync (`bin/sync-prd-to-stg.sh`).** Audio is signed/served from the *current* env's bucket using the stored filename, so synced prd episodes point at the stg bucket, where the objects don't exist → 404 on stg. The script is intentionally **not** changed (copying all prd audio would duplicate storage and cost). After a sync, choose one:
   - **Do nothing:** synced episodes have no working audio on stg; test with fresh uploads. Cheapest.
   - **Copy a subset (manual)**, only the files you need, using the Wasabi console or a CLI configured with both users' keys (or one temporary key with access to both buckets):
     ```bash
     # one file
     aws s3 cp s3://srs-web-audio/episode-audio/<file> s3://srs-web-audio-stg/episode-audio/<file> \
       --endpoint-url https://s3.ca-central-1.wasabisys.com
     # a few files / patterns
     aws s3 sync s3://srs-web-audio/episode-audio s3://srs-web-audio-stg/episode-audio \
       --endpoint-url https://s3.ca-central-1.wasabisys.com --exclude '*' --include '<pattern>*'
     ```
     (`rclone copy` works equally well.) Server-side copy within Wasabi; no download. Copies count toward stg storage and the 90-day minimum.
   - **Copy everything:** same `aws s3 sync` without `--exclude/--include`; doubles audio storage.
   Note that an `s3 sync`/copy needs read on prd and write on stg, which neither environment's IAM user has by design, so use a temporary key or the console and revoke afterwards.
2. **Request body size.** Confirm nothing in front of the app caps uploads below 300MB: Caddy (no default limit; check the real Caddyfile for `request_body max_size`), any Cloudflare/proxy (free plan caps at 100MB), and Next/Payload route limits. Test with a large file on stg.
3. **Upload memory/timeouts.** `@payloadcms/storage-s3` uploads via multipart; 300MB passes through the Node process. Check container memory and Caddy timeouts. Consider `useTempFiles: true` in Payload `upload` config if memory is tight.
4. **Orphaned objects.** Replacing/deleting an audio doc deletes the object by default (adapter hook). Wasabi has a 90-day minimum storage charge, so churn costs money.
5. **Wasabi egress policy.** Free-trial/pay-as-you-go accounts require monthly egress ≤ stored volume; heavy public streaming can breach this. Monitor.
6. **Housekeeping.** Add a README section for S3 setup; git shows `.claude/planning/update-audio-player.md` deleted and `.agents/skills/payload/update-audio-player.md` untracked (a move) — commit intentionally or restore.
7. CORS is only needed for waveform/AudioContext, not for Howler `html5: true`. Skip unless that changes.

## Wasabi setup instructions

Console: https://console.wasabisys.com (ca-central-1 endpoint: `https://s3.ca-central-1.wasabisys.com`). Repeat steps 1–3 for each environment, substituting the names in the table.

| | stg | prd |
|---|---|---|
| Bucket | `srs-web-audio-stg` | `srs-web-audio` |
| IAM policy | `sookelive-stg-audio` | `sookelive-prd-audio` |
| IAM user | `sookelive-stg` | `sookelive-prd` |

### 1. Bucket
Buckets → Create: name from the table, region `ca-central-1`. Leave versioning off (avoids paying for old copies).

### 2. Keep the bucket private
Do NOT add a public-read policy or public ACLs. Access is only via the IAM user's keys (the app signs download URLs with them). The IAM policy in step 3 (which includes `s3:GetObject`) is sufficient for signing.

### 3. IAM policy + user (Policies → Create, then Users → Create programmatic user)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::<bucket>",
      "Condition": { "StringLike": { "s3:prefix": ["episode-audio/*"] } } },
    { "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
      "Resource": "arn:aws:s3:::<bucket>/episode-audio/*" }
  ]
}
```
Attach to the matching user, generate an access key, and record the secret immediately (shown once).

### 4. Environment variables

| Var | stg | prd | Secret? | Where |
|---|---|---|---|---|
| `S3_BUCKET` | `srs-web-audio-stg` | `srs-web-audio` | no | `.env.stg` / `.env.prd` (committed, done) |
| `S3_REGION` | `ca-central-1` | same | no | same |
| `S3_ENDPOINT` | `https://s3.ca-central-1.wasabisys.com` | same | no | same |
| `S3_ACCESS_KEY_ID` | stg user key | prd user key | **yes** | local `.env`; GitHub secret |
| `S3_SECRET_ACCESS_KEY` | stg user secret | prd user secret | **yes** | local `.env`; GitHub secret |

Never commit the two secrets or put them anywhere but `.env` (gitignored) and GitHub secrets.

## Rollout

### Phase A — local test
1. Create the stg bucket, policy and IAM user/key (above). Local testing uses the **stg** bucket, never prd.
2. `pnpm ii` (installs `@payloadcms/storage-s3`). In `.env`, uncomment the `S3_*` vars from `.env.example` and add the stg-user keys.
3. Restart the dev server (cc-container: `pkill -f 'pnpm dev'` then `nohup pnpm dev > /tmp/dev-server.log 2>&1 &`; confirm port 3000 is actually rebound).
4. Smoke tests (as admin at `/admin`):
   1. Upload a small mp3 to **Episode Audio**. Expect no error; the object appears in Wasabi at `srs-web-audio-stg/episode-audio/<filename>`.
   2. The doc's URL is the site route `/api/episode-audio/file/<filename>`. `curl -I` on it returns `302` with a `Location` of a Wasabi URL containing `X-Amz-Signature` and `X-Amz-Expires`.
   3. `curl -I -H 'Range: bytes=0-1023' <Location URL>` → `206 Partial Content` with `Accept-Ranges: bytes`.
   3b. Privacy check: the same object URL **without** the signature (`https://s3.ca-central-1.wasabisys.com/<bucket>/episode-audio/<filename>`) returns `403`; an expired signed URL returns `403`.
   4. Create an Episode for a show, attach the audio, publish; the episode page player plays and seeking works.
   5. Log in as a host user: can upload/attach audio from the episode drawer, cannot see/delete others' uploads.
   6. Delete the doc → object removed from Wasabi.
   7. Upload a ~250MB file: succeeds without timeout.
   8. Unset the `S3_*` vars, restart dev: uploads fall back to `public/episode-audio` without errors (schema unchanged because of `alwaysInsertFields`).
   9. Guard check: `NODE_ENV=production` with the vars unset (`pnpm build`) fails with "Missing required S3 env vars in production"; with them set, the build passes.
5. Run `pnpm generate:types`, `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:int` (int tests run with `NODE_ENV=test`, so the guard doesn't apply).

### Phase B — stg server
1. Add GitHub secrets `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` with the **stg** user's keys (environment-scoped if possible). `deploy.yml` fails until both exist.
2. Check the real Caddyfile on the server for body size and timeout limits.
3. After explicit approval, push/merge to `stg` (do not push to protected branches without permission).
4. Post-deploy: check `docker compose logs` for S3 errors, run `POST /api/revalidate-all` (Bearer `$CRON_SECRET`), then repeat smoke tests 1–7 on the stg site, including a large upload through Caddy and playback in an incognito window.
5. After any prd → stg DB sync, follow the audio options in item 1 above (the script itself does not copy audio).

### Phase C — prd (later)
Create the prd bucket policy and user, set prd GitHub secrets (environment-scoped), merge to `prd` with approval, repeat smoke tests, monitor Wasabi egress.

## Required follow-ups after implementation (CLAUDE.md practice)
- Security review of the diff (private-bucket/presigned-URL expiry, file-route rate limiting, IAM scope, secrets handling, upload limits/mime allow-list `audio/*`).
- Best-practice/code-smell review.
