# Deployment: GitHub Actions setup

Pushing to `stg` or `prd` runs `.github/workflows/deploy.yml`: a `quality` job
(typecheck + unit tests) gates a `deploy` job that rsyncs the repo to the
server, uploads a generated `.env`, builds the Docker image on the server
(the build needs the server-local MongoDB for static generation), health-checks
the container, and smoke-tests the public URL.

The workflow selects the GitHub Environment named after the branch
(`environment: ${{ github.ref_name }}`), so **adding a new environment** is:

1. Create a branch (e.g. `demo`) and add it to the `branches:` list in
   `.github/workflows/deploy.yml`.
2. Create a GitHub Environment with the same name and populate the secrets and
   variables below.
3. Add `.env.<branch>` (non-secret values only) to the repo, a Caddy site block
   for its domain, and a deploy directory on the server.

## GitHub Environments (Settings → Environments)

For **each** environment (`stg`, `prd`, ...):

- Set **Deployment branches → Selected branches** to only its own branch, so no
  other branch can read that environment's secrets.
- `prd` (recommended): add **Required reviewers** for a manual approval gate.
- Protect the `stg`/`prd` branches: block force-push and deletion.

### Secrets (per environment — set values in GitHub, never commit them)

| Secret | Description / provenance |
|---|---|
| `SSH_PRIVATE_KEY` | Deploy user's private key. Same key for stg/prd while they share a server; a separate server gets its own keypair. |
| `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -p <port> <host>`. |
| `MONGO_ROOT_PASSWORD` | Mongo root password on that environment's mongo (shared container today). |
| `PAYLOAD_SECRET` | Payload signing/encryption secret. **Generate a fresh value per environment** — never reuse across envs. |
| `CRON_SECRET` | Bearer token for the jobs/sync/revalidate endpoints. **Fresh value per environment.** |
| `AZURACAST_KEY` | Azuracast API key (same station → same value, unless a scoped key is created). |
| `SMTP_PASS` | SMTP password for the sending domain. |

### Variables (per environment)

| Variable | Description |
|---|---|
| `DEPLOY_IP` | Server host/IP. |
| `SSH_PORT` | SSH port. |
| `DEPLOY_USER` | *(optional, default `autobot`)* SSH user. |
| `DEPLOY_PATH` | Absolute deploy dir, **unique per environment** on a shared server (e.g. `/home/autobot/sookelive-prd`). |
| `MONGO_ROOT_USERNAME` | *(optional, default `admin`)* |
| `MONGO_DATABASE` | DB name — the data-isolation mechanism on the shared mongo. Must differ per environment (e.g. `payload-prd`). Mongo creates it lazily; no manual setup needed. |
| `COMPOSE_PROJECT_NAME` | *(optional but recommended)* Freezes the compose project — and the `<project>_web_media` media volume name — against directory renames. For an existing env, set it to the **currently derived** name (see below); for a new env, pick one up front (e.g. `sookelive-prd`). |

`DB_PORT` and `DB_NAME` are no longer used — remove them from existing
environments.

## Server-side one-time prep (per environment)

1. Create the deploy dir matching `DEPLOY_PATH`, owned by the deploy user.
2. **Existing envs — freeze the media volume name first**: in the deploy dir,
   read the current compose project prefix (`docker compose ls`,
   `docker volume ls | grep web_media`) and set `COMPOSE_PROJECT_NAME` to
   exactly that derived name. Changing it later without migrating the volume
   orphans the uploaded media.
3. Note on hand-edited files: the deploy rsync does **not** use `--delete`, so
   files you place on the server yourself survive deploys. But repo-tracked
   files edited directly on the server are overwritten by every deploy, and
   files deleted from the repo linger on the server until removed manually.
4. Caddyfile: add the environment's site block (see `Caddyfile.example` for the
   two-container shape), then
   `docker exec sookelive-caddy caddy reload --config /etc/caddy/Caddyfile`.
5. Mongo: nothing required — the DB is created lazily. Optionally pre-seed from
   a dump via `bin/mongorestore.sh`; otherwise the first `/admin` visit runs
   create-first-user.
6. Check disk headroom (`df -h`) and that mongo is healthy
   (`docker inspect --format '{{.State.Health.Status}}' sookelive-mongodb`).

## Verifying a deploy

The workflow itself verifies: config completeness (fails fast naming any
missing secret/var), mongo pre-flight, build success before the old container
is swapped, an in-container HTTP check, and public-URL smoke tests
(`/`, `/posts`, `/shows`, `/admin` plus a homepage content check).

Manual spot checks after a first deploy to a new/changed environment:

- Server `.env` without printing values: `stat -c %a .env` → `600`;
  `grep -oE '^[A-Za-z_]+' .env` → expected key names only.
- `docker volume ls` still shows the same `<project>_web_media` volume and a
  pre-existing media upload renders on the site.
- Deploy dir: `.env`, `Caddyfile`, `db/`, and any hand-placed files intact.
- Other environments on the shared server still serve.
