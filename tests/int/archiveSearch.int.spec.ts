import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { archivePageNumbers, queryArchive, queryShowOptions } from '@/components/ArchivePage/query'
import { deleteAll, getTestPayload } from './helpers/payload'
import { minimalContent } from './helpers/fixtures'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString()

const titles = (result: { docs: { title?: string | null }[] }) => result.docs.map((d) => d.title)

describe('archive search and filtering', () => {
  let jazzShowId: string

  beforeAll(async () => {
    const payload = await getTestPayload()

    const lindy = await payload.create({ collection: 'hosts', data: { title: 'Lindy Hopper' } })
    const sam = await payload.create({ collection: 'hosts', data: { title: 'Sam Spinner' } })
    const jazz = await payload.create({ collection: 'genres', data: { title: 'Jazz' } })
    const news = await payload.create({ collection: 'categories', data: { title: 'Station News' } })

    const jazzShow = await payload.create({
      collection: 'shows',
      data: {
        title: 'Flight Plan',
        hosts: [lindy.id],
        genres: [jazz.id],
        content: minimalContent,
        _status: 'published',
      },
    })
    jazzShowId = jazzShow.id
    const rockShow = await payload.create({
      collection: 'shows',
      data: { title: 'Rock Hour', hosts: [sam.id], content: minimalContent, _status: 'published' },
    })

    const episodes = [
      { title: 'Takeoff', show: jazzShow.id, offset: -3, tracklist: [{ artist: 'David Bowie', title: 'Heroes' }] },
      { title: 'Landing', show: jazzShow.id, offset: -1, tracklist: [{ artist: 'Nina Simone', title: 'Sinnerman' }] },
      { title: 'Riffs', show: rockShow.id, offset: -2, tracklist: [{ artist: 'David Bowie', title: 'Starman' }] },
      { title: 'Upcoming Bowie', show: jazzShow.id, offset: 5, tracklist: [{ artist: 'David Bowie', title: 'Changes' }] },
    ]
    for (const { offset, ...data } of episodes) {
      await payload.create({
        collection: 'episodes',
        user: adminUser,
        data: { ...data, dateAired: daysFromNow(offset), _status: 'published' },
      })
    }
    await payload.create({
      collection: 'episodes',
      draft: true,
      user: adminUser,
      data: { title: 'Draft Bowie', show: jazzShow.id, dateAired: daysFromNow(-1), _status: 'draft' },
    })

    await payload.create({
      collection: 'posts',
      data: {
        title: 'Fundraiser recap',
        categories: [news.id],
        content: minimalContent,
        publishedAt: daysFromNow(-1),
        _status: 'published',
      },
    })
    await payload.create({
      collection: 'posts',
      data: { title: 'Gear review', content: minimalContent, publishedAt: daysFromNow(-2), _status: 'published' },
    })
  })

  afterAll(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
    await deleteAll(payload, 'posts')
    await deleteAll(payload, 'hosts')
    await payload.delete({ collection: 'genres', where: { id: { exists: true } } })
    await payload.delete({ collection: 'categories', where: { id: { exists: true } } })
  })

  it('lists aired, published episodes newest first when unfiltered', async () => {
    const result = await queryArchive({ collection: 'episodes', page: 1 })
    expect(titles(result)).toEqual(['Landing', 'Riffs', 'Takeoff'])
  })

  it('matches episode tracklist artists, case-insensitively', async () => {
    const result = await queryArchive({ collection: 'episodes', page: 1, q: 'bowie' })
    expect(titles(result)).toEqual(['Riffs', 'Takeoff'])
  })

  it("matches an episode's show title and the show's host names", async () => {
    expect(titles(await queryArchive({ collection: 'episodes', page: 1, q: 'flight' }))).toEqual([
      'Landing',
      'Takeoff',
    ])
    expect(titles(await queryArchive({ collection: 'episodes', page: 1, q: 'spinner' }))).toEqual(['Riffs'])
  })

  it('requires every word to match, each in any field', async () => {
    const result = await queryArchive({ collection: 'episodes', page: 1, q: 'bowie lindy' })
    expect(titles(result)).toEqual(['Takeoff'])
  })

  it('filters episodes by show, combined with search', async () => {
    expect(titles(await queryArchive({ collection: 'episodes', page: 1, showId: jazzShowId }))).toEqual([
      'Landing',
      'Takeoff',
    ])
    expect(
      titles(await queryArchive({ collection: 'episodes', page: 1, showId: jazzShowId, q: 'simone' })),
    ).toEqual(['Landing'])
  })

  it('treats regex metacharacters in the query literally', async () => {
    const result = await queryArchive({ collection: 'episodes', page: 1, q: '.*' })
    expect(result.totalDocs).toBe(0)
  })

  it('matches shows by host and genre', async () => {
    expect(titles(await queryArchive({ collection: 'shows', page: 1, q: 'hopper' }))).toEqual(['Flight Plan'])
    expect(titles(await queryArchive({ collection: 'shows', page: 1, q: 'jazz' }))).toEqual(['Flight Plan'])
  })

  it('matches posts by category title', async () => {
    expect(titles(await queryArchive({ collection: 'posts', page: 1, q: 'station' }))).toEqual([
      'Fundraiser recap',
    ])
  })

  it('lists published shows for the filter dropdown, sorted by title', async () => {
    expect((await queryShowOptions()).map((s) => s.title)).toEqual(['Flight Plan', 'Rock Hour'])
  })

  it('counts static pages from aired, published episodes only', async () => {
    expect(await archivePageNumbers('episodes')).toEqual([{ pageNumber: '1' }])
  })
})
