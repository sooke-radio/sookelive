import { afterEach, describe, expect, it } from 'vitest'

import { deleteAll, getTestPayload } from './helpers/payload'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

describe('Episode media embeds', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
  })

  // Published (not draft) saves, since Payload skips field validation on drafts.
  const createEpisode = async (embeds: unknown[]) => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })
    return payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Episode',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
        embeds,
      } as any,
    })
  }

  it('stores canonical embed srcs for each provider, in order', async () => {
    const episode = await createEpisode([
      { type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { type: 'soundcloud', url: 'https://soundcloud.com/artist/track' },
      {
        type: 'mixcloud',
        url: '<iframe src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2Fuser%2Fshow%2F"></iframe>',
      },
    ])

    expect(episode.embeds?.map((e) => e.type)).toEqual(['youtube', 'soundcloud', 'mixcloud'])
    expect(episode.embeds?.[0]?.url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(episode.embeds?.[1]?.url).toBe(
      `https://w.soundcloud.com/player/?url=${encodeURIComponent('https://soundcloud.com/artist/track')}`,
    )
    expect(episode.embeds?.[2]?.url).toBe(
      `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent('/user/show/')}`,
    )
  })

  it('rejects a URL from the wrong host for the provider', async () => {
    await expect(
      createEpisode([{ type: 'youtube', url: 'https://evil.example/watch?v=dQw4w9WgXcQ' }]),
    ).rejects.toThrow(/Media embeds 1 > Url/)
  })

  it('requires a url on every embed row', async () => {
    await expect(createEpisode([{ type: 'youtube' }])).rejects.toThrow(/Media embeds 1 > Url/)
  })
})
