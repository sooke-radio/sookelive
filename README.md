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

### Security Features

- ✅ No database ports exposed to host
- ✅ Application port 3000 not exposed to host (no UFW bypass)
- ✅ Caddy in Docker communicates via container network (no localhost binding)
- ✅ Internal Docker network for container communication
- ✅ MongoDB authentication enabled
- ✅ MongoDB can be managed independently
- ✅ Services communicate via container names only
- ✅ Only Caddy exposes ports 80/443 (standard web ports)
