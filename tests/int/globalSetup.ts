import path from 'path'
import { fileURLToPath } from 'url'
import { MongoMemoryServer } from 'mongodb-memory-server'

const dirname = path.dirname(fileURLToPath(import.meta.url))

let mongod: MongoMemoryServer | undefined

// Runs once, in the main process, before any test file's worker spawns -
// env vars set here are inherited by those workers. payload.config.ts reads
// DATABASE_URI/PAYLOAD_SECRET etc. at module-eval time (not lazily), so
// these must land before anything imports @payload-config.
export async function setup() {
  // mongodb-memory-server's default binary cache is ~/.cache/mongodb-binaries.
  // In the cc-container dev environment that's a small tmpfs (already
  // filled by pnpm's own store), so point it at real disk under
  // node_modules instead (gitignored, persists across test runs).
  process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(
    dirname,
    '../../node_modules/.cache/mongodb-binaries',
  )

  // Pinned to match docker-compose.mongodb.yml's `mongo:7.0` so integration
  // tests run against the same major version as prod/stg/dev.
  mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } })

  process.env.DATABASE_URI = mongod.getUri('sookelive-test')
  process.env.PAYLOAD_SECRET = 'test-payload-secret'
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'

  // Point the mailer at a closed local port so Payload's transport-verify
  // step (see src/plugins/mailer.ts) fails instantly (ECONNREFUSED) instead
  // of waiting out a real connection timeout to the real SMTP host.
  process.env.SMTP_HOST = '127.0.0.1'
  process.env.SMTP_PORT = '1'
  process.env.SMTP_USER = 'test'
  process.env.SMTP_PASS = 'test'

  // An obviously-fake host: if a test forgets to mock a request through
  // msw, it fails loudly (unhandled request / connection error) instead of
  // ever risking a real call to production Azuracast.
  process.env.AZURACAST_URL = 'https://azuracast.test'
  process.env.AZURACAST_STATION_ID = 'test-station'
  process.env.AZURACAST_KEY = 'test-key'
}

export async function teardown() {
  await mongod?.stop()
}
