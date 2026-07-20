import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateMeta } from './generateMeta'

describe('generateMeta', () => {
  const originalServerUrl = process.env.NEXT_PUBLIC_SERVER_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://sooke.live'
  })

  afterEach(() => {
    if (originalServerUrl === undefined) Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_SERVER_URL')
    else process.env.NEXT_PUBLIC_SERVER_URL = originalServerUrl
  })

  it('falls back to the site default title when doc has no meta title', async () => {
    const meta = await generateMeta({ doc: {} })
    expect(meta.title).toBe('Sooke.live Community Radio')
  })

  it('appends " | Sooke.live" to a provided meta title', async () => {
    const meta = await generateMeta({ doc: { meta: { title: 'About' } } })
    expect(meta.title).toBe('About | Sooke.live')
  })

  it('passes through the meta description', async () => {
    const meta = await generateMeta({ doc: { meta: { description: 'A radio station' } } })
    expect(meta.description).toBe('A radio station')
  })

  it('falls back to the default logo image when the doc has no image', async () => {
    const meta = await generateMeta({ doc: {} })
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://sooke.live/api/media/file/SRS-Logo-white-bg-1.png' },
    ])
  })

  it('prefers the og-sized image variant when available', async () => {
    const meta = await generateMeta({
      doc: {
        meta: {
          image: {
            url: '/api/media/file/full.png',
            sizes: { og: { url: '/api/media/file/full-og.png' } },
          } as any,
        },
      },
    })
    expect(meta.openGraph?.images).toEqual([{ url: 'https://sooke.live/api/media/file/full-og.png' }])
  })

  it('falls back to the full image url when no og size exists', async () => {
    const meta = await generateMeta({
      doc: { meta: { image: { url: '/api/media/file/full.png' } as any } },
    })
    expect(meta.openGraph?.images).toEqual([{ url: 'https://sooke.live/api/media/file/full.png' }])
  })

  it('joins an array slug into a URL path', async () => {
    const meta = await generateMeta({ doc: { slug: ['shows', 'my-show'] as any } })
    expect(meta.openGraph?.url).toBe('shows/my-show')
  })

  it('defaults the openGraph url to "/" when slug is not an array', async () => {
    const meta = await generateMeta({ doc: { slug: 'about' } })
    expect(meta.openGraph?.url).toBe('/')
  })
})
