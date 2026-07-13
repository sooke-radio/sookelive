import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { syncPlaylists } from '@/collections/Playlists/syncPlaylists'
import { AZURACAST_PLAYLISTS_URL, server } from './helpers/msw'
import { deleteAll, getTestPayload } from './helpers/payload'

type AzuracastPlaylist = {
  id: number
  name: string
  short_name: string
  schedule_items?: unknown[]
}

function mockAzuracastPlaylists(playlists: AzuracastPlaylist[]) {
  server.use(http.get(AZURACAST_PLAYLISTS_URL, () => HttpResponse.json(playlists)))
}

describe('syncPlaylists', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'playlists')
  })

  it('creates a local playlist for each item Azuracast returns', async () => {
    mockAzuracastPlaylists([
      { id: 1, name: 'Morning Show', short_name: 'morning_show' },
      { id: 2, name: 'Evening Mix', short_name: 'evening_mix' },
    ])

    const payload = await getTestPayload()
    await syncPlaylists(payload)

    const { docs } = await payload.find({ collection: 'playlists', sort: 'az_id' })
    expect(docs.map((d) => ({ az_id: d.az_id, name: d.name }))).toEqual([
      { az_id: 1, name: 'Morning Show' },
      { az_id: 2, name: 'Evening Mix' },
    ])
  })

  it('updates an existing playlist by az_id instead of duplicating it', async () => {
    mockAzuracastPlaylists([{ id: 1, name: 'Morning Show', short_name: 'morning_show' }])
    const payload = await getTestPayload()
    await syncPlaylists(payload)

    mockAzuracastPlaylists([
      { id: 1, name: 'Morning Show (Renamed)', short_name: 'morning_show' },
    ])
    await syncPlaylists(payload)

    const { docs } = await payload.find({ collection: 'playlists' })
    expect(docs).toHaveLength(1)
    expect(docs[0].name).toBe('Morning Show (Renamed)')
  })

  it('deletes local playlists Azuracast no longer returns (the destructive not_in path)', async () => {
    mockAzuracastPlaylists([
      { id: 1, name: 'Morning Show', short_name: 'morning_show' },
      { id: 2, name: 'Evening Mix', short_name: 'evening_mix' },
    ])
    const payload = await getTestPayload()
    await syncPlaylists(payload)

    mockAzuracastPlaylists([{ id: 1, name: 'Morning Show', short_name: 'morning_show' }])
    await syncPlaylists(payload)

    const { docs } = await payload.find({ collection: 'playlists' })
    expect(docs).toHaveLength(1)
    expect(docs[0].az_id).toBe(1)
  })

  it('skips the sync and returns a warning instead of deleting everything when Azuracast returns no playlists', async () => {
    mockAzuracastPlaylists([{ id: 1, name: 'Morning Show', short_name: 'morning_show' }])
    const payload = await getTestPayload()
    await syncPlaylists(payload)

    mockAzuracastPlaylists([])
    const { warning, results } = await syncPlaylists(payload)

    expect(warning).toMatch(/zero playlists/i)
    expect(results).toEqual([])

    const { docs } = await payload.find({ collection: 'playlists' })
    expect(docs).toHaveLength(1)
    expect(docs[0].az_id).toBe(1)
  })

  it('returns a null warning on a normal, non-empty sync', async () => {
    mockAzuracastPlaylists([{ id: 1, name: 'Morning Show', short_name: 'morning_show' }])
    const payload = await getTestPayload()

    const { warning } = await syncPlaylists(payload)

    expect(warning).toBeNull()
  })

  it('stores schedule_items when present, and null when absent', async () => {
    mockAzuracastPlaylists([
      {
        id: 1,
        name: 'Morning Show',
        short_name: 'morning_show',
        schedule_items: [{ start_time: 900, end_time: 1100, days: [1] }],
      },
      { id: 2, name: 'Evening Mix', short_name: 'evening_mix' },
    ])

    const payload = await getTestPayload()
    await syncPlaylists(payload)

    const { docs } = await payload.find({ collection: 'playlists', sort: 'az_id' })
    expect(docs[0].schedule_items).toEqual([{ start_time: 900, end_time: 1100, days: [1] }])
    expect(docs[1].schedule_items).toBeNull()
  })
})
