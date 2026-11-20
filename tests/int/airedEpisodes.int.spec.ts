import { afterEach, describe, expect, it } from 'vitest'

import { airedEpisodesWhere } from '@/utilities/airedEpisodes'
import { deleteAll, getTestPayload } from './helpers/payload'
import { minimalContent } from './helpers/fixtures'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString()

describe('airedEpisodesWhere', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
  })

  it('excludes future-dated episodes from listings and page counts', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', content: minimalContent, _status: 'published' },
    })

    for (const [title, offset] of [
      ['Last week', -7],
      ['Yesterday', -1],
      ['Tomorrow', 1],
      ['Next month', 30],
    ] as const) {
      await payload.create({
        collection: 'episodes',
        user: adminUser,
        data: { title, show: show.id, dateAired: daysFromNow(offset), _status: 'published' },
      })
    }

    // Same shape as /episodes and ShowView's queryEpisodesByShow.
    const where = {
      show: { equals: show.id },
      _status: { equals: 'published' },
      ...airedEpisodesWhere(),
    }

    const listed = await payload.find({
      collection: 'episodes',
      overrideAccess: false,
      sort: ['-dateAired', '-id'],
      where,
    })
    const { totalDocs } = await payload.count({ collection: 'episodes', overrideAccess: false, where })

    expect(listed.docs.map((d) => d.title)).toEqual(['Yesterday', 'Last week'])
    expect(totalDocs).toBe(2)
  })
})
