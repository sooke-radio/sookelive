### Sooke.live Web App

Online at [Sooke.live](https://sooke.live).

An online community radio station built with [Payload CMS](https://payloadcms.com) and [Azuracast](https://www.azuracast.com/).

## Docker Deployment

This project uses Docker Compose with secure container networking. Services communicate via container names on an internal network, and ports are not exposed to the host for security.

MongoDB is separated into its own compose file (`docker-compose.mongodb.yml`) so it can be managed independently from the application.

### Prerequisites

- Docker and Docker Compose installed
- Environment variables configured in `.env` file:
  - `MONGO_ROOT_USERNAME` (default: admin)
  - `MONGO_ROOT_PASSWORD` (required)
  - `MONGO_DATABASE` (default: payload)
  - `PAYLOAD_SECRET` (required)
  - Other application-specific variables

### Running the Application

#### Start MongoDB (first time or after stopping)

```bash
docker-compose -f docker-compose.mongodb.yml up -d
```

#### Start the Application

```bash
docker-compose up -d
```

#### Start All Services Together (MongoDB + Application + Caddy)

```bash
docker-compose -f docker-compose.mongodb.yml -f docker-compose.yml -f docker-compose.caddy.yml up -d
```

#### Start Caddy Reverse Proxy

```bash
docker-compose -f docker-compose.caddy.yml up -d
```

#### Stop MongoDB Independently

```bash
docker-compose -f docker-compose.mongodb.yml down
```

#### Stop the Application

```bash
docker-compose down
```

#### View Logs

```bash
# Application logs
docker-compose logs -f

# MongoDB logs
docker-compose -f docker-compose.mongodb.yml logs -f

# Caddy logs
docker-compose -f docker-compose.caddy.yml logs -f
```

### Caddy Reverse Proxy Setup

Caddy is configured to run in Docker on the same network, ensuring no application ports are exposed to the host (keeping UFW secure).

#### Initial Setup

1. Copy the example Caddyfile:
   ```bash
   cp Caddyfile.example Caddyfile
   ```

2. Edit `Caddyfile` and update the domain name(s) to match your setup

3. Start Caddy:
   ```bash
   docker-compose -f docker-compose.caddy.yml up -d
   ```

#### How It Works

- Caddy runs in Docker on the `sookelive-network`
- Caddy connects to the application via container name: `sookelive-payload:3000`
- **No ports are exposed for the application** - only Caddy exposes ports 80/443
- This means Docker won't create iptables rules that bypass UFW for port 3000
- All traffic goes through Caddy, which handles SSL/TLS automatically

#### Caddy Configuration

The `Caddyfile` should proxy to `sookelive-payload:3000` (container name, not localhost). Example:

```
sooke.live {
    reverse_proxy sookelive-payload:3000
}
```

Caddy will automatically:
- Obtain SSL certificates via Let's Encrypt
- Handle HTTP to HTTPS redirects
- Provide security headers
- Enable compression

### External Access

The application container does not expose port 3000 to the host. All external access goes through Caddy (ports 80/443), which proxies to the application container via Docker's internal network.

For local development without Caddy, you can uncomment the ports section in `docker-compose.yml`:
```yaml
ports:
  - ${APP_PORT:-3000}:3000
```

### Using an External Database

If you prefer to use an external MongoDB instance instead of the containerized one:

1. Set `DATABASE_URI` in your `.env` file with your external database connection string
2. Do not start the MongoDB compose file
3. The application will use the `DATABASE_URI` from `.env` instead of the container name

## Development Container (cc-container)

`docker-compose.cc-container.yml` runs a Claude Code dev container attached to the same `sookelive-network` as the app/mongodb/caddy containers, so it can reach mongodb directly by container name during development.

### Prerequisites

- The shared `sookelive-network` must exist first:
  ```bash
  docker-compose -f docker-compose.mongodb.yml up -d
  ```
- The `claude-code-docker` repo checked out somewhere on this host. Adjust `build.context` in `docker-compose.cc-container.yml` if it isn't a sibling directory of this project.
- The shared auth volume (create once, only if it doesn't already exist):
  ```bash
  docker volume create claude-code-auth
  ```
- A `.env` in this repo's root (copy `.env.example`'s keys into it with real values), plus `DATABASE_URI` pointing at the mongodb container (see below). It's bind-mounted into the container along with the rest of the repo and read directly by Next.js/Payload at runtime - same file used for non-Docker local dev. Note that Claude Code sessions running inside cc-container can read this file (and anything else in the container's environment), since they run as the same user as the dev server - don't put credentials in here that are shared with anything higher-stakes (e.g. reuse a distinct password for the local dev MongoDB root user, not a production one).

### Running

```bash
bin/cc-dev.sh
```

This checks for the prerequisites above, starts mongodb (and the shared network), starts cc-container, and attaches you to a Claude Code session inside it, resuming the previous session for this directory if one exists (or opening the picker if there are several) - see the script for exactly what it does. Equivalent to running by hand:

```bash
docker-compose -f docker-compose.mongodb.yml up -d
docker-compose -f docker-compose.cc-container.yml up -d --build
docker-compose -f docker-compose.cc-container.yml exec --user claude cc-container claude --resume
```

**Always pass `--user claude` to `exec`** if you're not using the script. The image has no `USER claude` Dockerfile instruction - `entrypoint.sh` only drops from root to `claude` (via `gosu`) for the container's main process, not for `docker exec`, which otherwise defaults to root. Since `cap_drop: ALL` also strips `CAP_DAC_OVERRIDE`, a root exec shell can't even read files it doesn't own (like the `claude-config` volume's `.credentials.json`, `600` and owned by `claude`) - so without `--user claude` you'll get a fresh login prompt every time, and any files you create from that shell come out root-owned instead of yours.

Inside the container, `/workspace/sookelive` is this repo, and MongoDB is reachable at `sookelive-mongodb:27017`. Set `DATABASE_URI` in `.env` to point there, e.g.:

```
DATABASE_URI=mongodb://admin:${MONGO_ROOT_PASSWORD}@sookelive-mongodb:27017/payload?authSource=admin
```

### Dev server auto-start

On `up`, the container runs `bin/cc-container-start.sh`, which installs deps (`pnpm ii`, only if `node_modules` is missing) and starts `pnpm dev` in the background, logging to `/tmp/dev-server.log`. The site is live at `http://localhost:${PORT1:-3000}` as soon as the container is up - no manual step needed - and a Claude Code session started inside the container can read/tail that same log file directly, since it's running in the same container (not a separate one it would need Docker socket access to reach).

To restart the dev server after changing dependencies:
```bash
pkill -f 'pnpm dev'
nohup pnpm dev > /tmp/dev-server.log 2>&1 &
```

### Seeding the local database from production

`bin/sync-prod-db.sh` pulls a `mongodump` from a deployed host (stg or prd) over SSH and restores it into the local mongodb container (`--drop`, so it replaces local data - it never touches the remote database). **Run this on the host, not inside cc-container** - cc-container's outbound firewall is expected to block SSH, and the script needs the Docker CLI/socket to reach the local mongodb container anyway, neither of which cc-container has:

```bash
bin/sync-prod-db.sh <user@host> <remote-deploy-path>
# or
PROD_SSH_HOST=autobot@1.2.3.4 PROD_DEPLOY_PATH=/home/autobot/sookelive bin/sync-prod-db.sh
```

This requires SSH access to the target host (the same key/user the GitHub Actions deploy workflow uses - see `.github/workflows/deploy.yml`) and a running local mongodb container. It prompts for confirmation before dropping local data; set `FORCE=1` to skip the prompt.

### Syncing local media from production

`bin/sync-prod-media.sh` pulls `public/media` (image uploads) from a deployed host (stg or prd) over SSH into this repo's local `public/media/`, for reproducing/debugging real images during development. Media lives in a Docker volume, so this goes through `docker exec` + `tar` on the remote container rather than reading the volume's files directly. **Run this on the host, not inside cc-container** (SSH is expected to be blocked there):

```bash
bin/sync-prod-media.sh <user@host>
# or
PROD_SSH_HOST=autobot@1.2.3.4 bin/sync-prod-media.sh
```

By default it only adds/overwrites files, never deleting local-only ones; set `CLEAN=1` to wipe local `public/media/` first for an exact mirror (prompts for confirmation unless `FORCE=1` is also set).

### Syncing stg from prd (on the server)

`bin/sync-prd-to-stg.sh` copies prd's database and media into stg for testing against real data. prd and stg run as separate app containers on the same host and share one mongodb container, so this runs entirely via local `docker exec` - no SSH, and it's meant to be run **on the server** (from the stg deploy checkout), not from a dev machine or cc-container:

```bash
bin/sync-prd-to-stg.sh
# or override defaults (sl2db -> stg, sookelive-prd -> sookelive-stg)
PRD_DB=sl2db STG_DB=stg PRD_CONTAINER=sookelive-prd STG_CONTAINER=sookelive-stg bin/sync-prd-to-stg.sh
```

The database copy goes through `bin/copy-db.sh`, which backs up stg's previous database to `./db/` before dropping it. Media sync only adds/overwrites files by default; set `CLEAN=1` to wipe stg's media first for an exact mirror. Prompts for confirmation unless `FORCE=1` is set.

### Security Features

- ✅ No database ports exposed to host
- ✅ Application port 3000 not exposed to host (no UFW bypass)
- ✅ Caddy in Docker communicates via container network (no localhost binding)
- ✅ Internal Docker network for container communication
- ✅ MongoDB authentication enabled
- ✅ MongoDB can be managed independently
- ✅ Services communicate via container names only
- ✅ Only Caddy exposes ports 80/443 (standard web ports)
