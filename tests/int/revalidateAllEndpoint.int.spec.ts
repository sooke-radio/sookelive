import { describe, expect, it, vi } from 'vitest'
import { revalidateAllEndpoint } from '@/endpoints/revalidateAll'
import { getTestPayload } from './helpers/payload'
import type { Payload, PayloadRequest } from 'payload'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

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

describe('POST /api/revalidate-all authorization', () => {
  it('rejects a request with no user and no cron secret', async () => {
    const payload = await getTestPayload()
    const res = await revalidateAllEndpoint.handler(makeRequest(payload))
    expect(res.status).toBe(401)
  })

  it('rejects an incorrect bearer token', async () => {
    const payload = await getTestPayload()
    const res = await revalidateAllEndpoint.handler(
      makeRequest(payload, { authHeader: 'Bearer wrong' }),
    )
    expect(res.status).toBe(401)
  })

  it('accepts a logged-in user and revalidates', async () => {
    const payload = await getTestPayload()
    const res = await revalidateAllEndpoint.handler(
      makeRequest(payload, { user: { collection: 'users', id: 'fake-user-id' } }),
    )
    expect(res.status).toBe(200)
  })

  it('accepts the correct CRON_SECRET bearer token', async () => {
    const payload = await getTestPayload()
    const res = await revalidateAllEndpoint.handler(
      makeRequest(payload, { authHeader: `Bearer ${process.env.CRON_SECRET}` }),
    )
    expect(res.status).toBe(200)
  })
})
