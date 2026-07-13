import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Playlists } from '@/collections/Playlists'
import { AZURACAST_PLAYLISTS_URL, server } from './helpers/msw'
import { deleteAll, getTestPayload } from './helpers/payload'
import type { Payload, PayloadRequest } from 'payload'

const syncEndpoint = Array.isArray(Playlists.endpoints)
  ? Playlists.endpoints.find((endpoint) => endpoint.path === '/sync' && endpoint.method === 'post')
  : undefined

if (!syncEndpoint) {
  throw new Error('Expected Playlists to define a POST /sync endpoint')
}

function makeRequest(
  payload: Payload,
  opts: { user?: unknown; authHeader?: string } = {},
): PayloadRequest {
  return {
    payload,
    user: opts.user ?? null,
    headers: new Headers(opts.authHeader ? { authorization: opts.authHeader } : {}),
  } as unknown as PayloadRequest
}

// Regression test for the fix to .claude/planning/cleanup-suggestions.md's
// "POST /api/playlists/sync is unauthenticated" item: anyone used to be
// able to trigger a sync (which deletes/recreates playlist docs) with no
// credentials at all.
describe('POST /api/playlists/sync authorization', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'playlists')
  })

  it('rejects a request with no user and no cron secret', async () => {
    const payload = await getTestPayload()
    const res = await syncEndpoint.handler(makeRequest(payload))
    expect(res.status).toBe(401)
  })

  it('rejects an incorrect bearer token', async () => {
    const payload = await getTestPayload()
    const res = await syncEndpoint.handler(makeRequest(payload, { authHeader: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it('accepts a logged-in user and performs the sync', async () => {
    server.use(http.get(AZURACAST_PLAYLISTS_URL, () => HttpResponse.json([])))
    const payload = await getTestPayload()

    const res = await syncEndpoint.handler(
      makeRequest(payload, { user: { collection: 'users', id: 'fake-user-id' } }),
    )
    expect(res.status).toBe(200)
  })

  it('accepts the correct CRON_SECRET bearer token', async () => {
    server.use(http.get(AZURACAST_PLAYLISTS_URL, () => HttpResponse.json([])))
    const payload = await getTestPayload()

    const res = await syncEndpoint.handler(
      makeRequest(payload, { authHeader: `Bearer ${process.env.CRON_SECRET}` }),
    )
    expect(res.status).toBe(200)
  })
})
