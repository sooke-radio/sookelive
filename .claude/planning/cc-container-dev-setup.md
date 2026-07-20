# cc-container dev setup

## Goal

Get `docker-compose.cc-container.yml` launching a working Claude Code dev
container for this project: mongodb already running via
`docker-compose.mongodb.yml`, cc-container joins the same `sookelive-network`,
auto-installs deps and starts `pnpm dev` in the background so the site is
live and a Claude Code session inside the container can read its logs
directly (no separate app container / no Docker socket needed).

## Approach

Files involved:
- `docker-compose.cc-container.yml` — the service definition.
- `bin/cc-container-start.sh` — the container's `command`, run after
  `entrypoint.sh` (from the external `claude-code-docker` image) drops
  privileges from root to the non-root `claude` user.
- `package.json` — `pnpm.onlyBuiltDependencies`.

Key design decisions:
- **Dev server runs in the same container as Claude Code**, not a separate
  service. The alternative (separate app container) would need the Docker
  socket mounted into cc-container just so Claude could reach its logs —
  a much bigger privilege escalation than running a dev server inside
  Claude's own already-sandboxed container.
- **Secrets stay outside the bind-mounted repo**: `env_file` points at
  `../sookelive-cc-container.env` (sibling to the repo, never bind-mounted),
  plus `/dev/null:/workspace/sookelive/.env:ro` as a defense-in-depth mask
  in case a real `.env` ever ends up in the repo root.
- **`bin/sync-prod-db.sh`** (pulls a prod mongodump over SSH) must run on the
  host, not inside cc-container — its outbound firewall is expected to block
  SSH, and the script needs the Docker CLI/socket to reach the local
  mongodb container anyway.

## Debugging log (fixes applied so far, in the order they were hit)

The `claude-code-docker` base image (`node:20-slim`) starts as root so
`entrypoint.sh` can run `init-firewall.sh` (needs `NET_ADMIN`), then uses
`gosu` to drop to the `claude` user before exec'ing the container's
`command`. Each of these was a real failure hit while bringing the
container up, fixed in this order:

1. **`gosu` failed: "operation not permitted"** — `cap_drop: ALL` +
   `cap_add: [NET_ADMIN, NET_RAW]` didn't include `SETUID`/`SETGID`, which
   `gosu` needs to change the process's UID/GID even as root, once
   capabilities are explicitly bounded. Fix: added `SETUID`/`SETGID` to
   `cap_add`.
2. **`corepack` (pnpm bootstrap) hit `EACCES` writing to
   `/home/claude/.cache/corepack/v1`** — the `tmpfs` mounts (`/tmp`,
   `~/.cache`, `~/.npm`, `~/.config`) default to root:root `0755` when no
   `mode` is given, unwritable by the non-root `claude` user. Fix: added
   `mode=1777` to every `tmpfs` entry.
3. **Build hung indefinitely at "Corepack is about to download..."** —
   recent corepack versions prompt for confirmation before fetching an
   unrecognized package manager version; `docker compose up` doesn't forward
   host stdin into the container, so nothing could ever answer it. Fix:
   added `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` to `environment`.
4. **`pnpm ii` failed: `ERR_PNPM_IGNORED_BUILDS` (esbuild, sharp)** — newer
   pnpm (11.x here) refuses to run any dependency's install/build scripts
   until explicitly approved (`pnpm approve-builds`, itself interactive —
   same hang risk as #3). This isn't cc-container-specific; it'd hit anyone
   doing a fresh `pnpm install` on a new-enough pnpm.
   First fix attempt (**wrong**, left in place for a while): added
   `pnpm.onlyBuiltDependencies: ["esbuild", "sharp"]` to `package.json`.
   pnpm 11 no longer reads the `"pnpm"` field in `package.json` at all — it
   warns `The "pnpm" field in package.json is no longer read by pnpm` and
   silently ignores it, so the ignored-builds gate kept failing.
   **Actual fix**: pnpm 11 moved this config to a `pnpm-workspace.yaml` file
   at the repo root, and the *actual* key it reads at this version is
   `allowBuilds` (a `{packageName: true|false}` map), not
   `onlyBuiltDependencies` (confirmed empirically: running
   `pnpm approve-builds --all` after a failed install writes an `allowBuilds`
   block, not `onlyBuiltDependencies`, into `pnpm-workspace.yaml`). Added:
   ```yaml
   allowBuilds:
     esbuild: true
     sharp: true
   ```
   Also moved the `pnpm.overrides` block from `package.json` (same
   "no longer read" warning applied to it) into `pnpm-workspace.yaml`'s
   top-level `overrides:` key, and deleted the now-dead `"pnpm"` field from
   `package.json` entirely.
   **Second, separate bug that masked this fix working**: even with
   `pnpm-workspace.yaml` correct, `pnpm ii` (`package.json`'s `"ii"` script)
   still failed the same way, because that script ran
   `pnpm --ignore-workspace install` — a flag present since the initial
   commit, from before this repo had a `pnpm-workspace.yaml` at all.
   `--ignore-workspace` makes pnpm skip `pnpm-workspace.yaml` entirely, so
   `allowBuilds`/`overrides` were never read no matter how correct the file
   was. Removed `--ignore-workspace` from both the `ii` and `reinstall`
   scripts in `package.json`. A plain `pnpm install` (and now `pnpm ii`)
   runs clean with no warnings and no ignored-builds error.
   **Note**: a failed `pnpm ii` attempt likely already created a (partial)
   `node_modules` before erroring, so `bin/cc-container-start.sh`'s
   `if [[ ! -d node_modules ]]` guard would skip reinstalling on a retry —
   remove `node_modules` before the next `up` after this fix landed.
5. **Requested**: keep the container up even if `pnpm ii`/`pnpm dev` fails,
   so it's still possible to `docker compose exec` in and debug with Claude
   Code from inside. Fix: rewrote `bin/cc-container-start.sh` to drop the
   blanket `set -e` and instead track a `setup_ok` flag through each risky
   step (`corepack enable`, `pnpm ii`, starting `pnpm dev`), logging clearly
   and always falling through to `exec sleep infinity` regardless of
   outcome.
6. **Claude Code re-prompted for login every time, despite the shared
   `claude-config`/`claude-code-auth` volume having valid credentials** —
   `docker compose exec` is a separate mechanism from the container's main
   process. `entrypoint.sh`'s `gosu` drop only applies to PID 1 and its
   children; `exec` always starts as whatever user the image's Dockerfile
   declares via `USER` (root, since this Dockerfile has no `USER claude`
   line - it relies entirely on runtime `gosu`). Normally root could still
   read another user's files, but `cap_drop: ALL` also strips
   `CAP_DAC_OVERRIDE`, so a capability-less root exec shell is subject to
   normal permission checks like anyone else - and can't read
   `.credentials.json` (`600`, owned by `claude`/uid 1000). Confirmed via
   `docker compose exec cc-container id` returning `uid=0(root)` even
   though the main process runs as `claude`. **Fix**: no file changed for
   this one - it's a usage requirement. Always exec with
   `docker compose -f docker-compose.cc-container.yml exec --user claude cc-container bash`.
   Documented in README.md's cc-container section, and folded into
   `bin/cc-dev.sh` (see below) so it can't be forgotten.

`bin/cc-dev.sh` wraps the whole launch sequence: checks `../claude-code-docker`
and `../sookelive-cc-container.env` exist (clear error if not), ensures the
`claude-code-auth` volume exists (idempotent `docker volume create`, never
overwrites existing credentials), starts mongodb, starts cc-container, then
`exec`s into it with `--user claude`. README.md points at this as the primary
way to launch, with the manual multi-command equivalent kept alongside it.

## Open questions / not yet verified

- `entrypoint.sh`'s exact contents were never shown — the `gosu`-drop
  behavior (fix #1, #6) is inferred from the Dockerfile's comments and
  observed behavior, not read directly. If something UID/permissions-related
  still looks wrong, ask for `entrypoint.sh` and `init-firewall.sh` to
  confirm.
- Whether the firewall's default allowlist (beyond "open web, ports 80/443
  to any host" per the observed log line) is permissive enough for
  everything `pnpm dev`/Payload need at runtime (e.g. outbound requests to
  Azuracast, SMTP) — not yet exercised.
- **New, separate from the install issue**: `pnpm dev` starts and compiles
  fine inside cc-container, but `GET /` 500s — Next.js can't reach MongoDB.
  `DATABASE_URI` in the sibling env file is `mongodb://127.0.0.1:27017/sl-p3`,
  but cc-container doesn't run its own mongodb; it's supposed to reach the
  `sookelive-mongodb` container over the shared `sookelive-network` (see
  Approach section above). `DATABASE_URI` likely needs to point at
  `sookelive-mongodb:27017` instead of `127.0.0.1`. Not yet fixed or
  confirmed - the sibling env file lives outside the repo
  (`../.sookelive-dev.env`) so wasn't checked/edited during this session.

## Status

`pnpm ii`/`pnpm dev` install issue (fix #4) is now fully resolved and
verified end-to-end inside a running cc-container: clean `rm -rf
node_modules && pnpm ii` completes with no warnings and no
`ERR_PNPM_IGNORED_BUILDS`, and `pnpm dev` starts and compiles successfully.
Root cause was two-layered — pnpm 11 stopped reading `package.json`'s
`"pnpm"` field (needed a `pnpm-workspace.yaml` with the correct `allowBuilds`
key instead of the old `onlyBuiltDependencies` guess), and separately the
`ii`/`reinstall` scripts' `--ignore-workspace` flag (predating
`pnpm-workspace.yaml`, never revisited) was making pnpm skip that file
entirely regardless of its contents. See fix #4 above for the full detail.

Next blocker (new, unrelated to the install): the running dev server 500s
on `GET /` because it can't reach MongoDB — see the `DATABASE_URI` item
above.
