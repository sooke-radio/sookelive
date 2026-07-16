import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import { generatePreviewPath } from './generatePreviewPath'

const originalEnv = process.env.NEXT_PUBLIC_SERVER_URL

afterEach(() => {
  if (originalEnv === undefined) Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_SERVER_URL')
  else process.env.NEXT_PUBLIC_SERVER_URL = originalEnv
  vi.unstubAllEnvs()
})

const mockReq = (host: string, protocol = 'http:') =>
  ({ host, protocol }) as unknown as PayloadRequest

describe('generatePreviewPath', () => {
  it('builds the preview URL from the request host, ignoring NEXT_PUBLIC_SERVER_URL', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'

    const url = generatePreviewPath({
      collection: 'shows',
      slug: 'my-show',
      req: mockReq('10.0.0.142:3006'),
    })

    expect(url.startsWith('http://10.0.0.142:3006/next/preview?')).toBe(true)
  })

  it('falls back to NEXT_PUBLIC_SERVER_URL when the request has no host', () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://sooke.live'

    const url = generatePreviewPath({
      collection: 'shows',
      slug: 'my-show',
      req: mockReq(''),
    })

    expect(url.startsWith('https://sooke.live/next/preview?')).toBe(true)
  })

  it('forces https in production even when the request came in over http', () => {
    vi.stubEnv('NODE_ENV', 'production')

    const url = generatePreviewPath({
      collection: 'shows',
      slug: 'my-show',
      req: mockReq('sooke.live', 'http:'),
    })

    expect(url.startsWith('https://sooke.live/next/preview?')).toBe(true)
  })
})
