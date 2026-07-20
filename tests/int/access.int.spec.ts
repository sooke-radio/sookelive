import { afterEach, describe, expect, it } from 'vitest'
import { deleteAll, getTestPayload } from './helpers/payload'

describe('Playlists collection access control (read-only via the API)', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'playlists')
  })

  it('allows unauthenticated reads', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.find({ collection: 'playlists', overrideAccess: false }),
    ).resolves.toBeDefined()
  })

  it('rejects create through access control, even with overrideAccess off', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.create({
        collection: 'playlists',
        overrideAccess: false,
        data: {
          az_id: 999,
          name: 'Blocked',
          short_name: 'blocked',
          is_enabled: true,
          lastSync: new Date().toISOString(),
        },
      }),
    ).rejects.toThrow()
  })

  it('rejects update through access control', async () => {
    const payload = await getTestPayload()
    const created = await payload.create({
      collection: 'playlists',
      data: {
        az_id: 998,
        name: 'Seed',
        short_name: 'seed-update',
        is_enabled: true,
        lastSync: new Date().toISOString(),
      },
    })

    await expect(
      payload.update({
        collection: 'playlists',
        id: created.id,
        overrideAccess: false,
        data: { name: 'Changed' },
      }),
    ).rejects.toThrow()
  })

  it('rejects delete through access control', async () => {
    const payload = await getTestPayload()
    const created = await payload.create({
      collection: 'playlists',
      data: {
        az_id: 997,
        name: 'Seed',
        short_name: 'seed-delete',
        is_enabled: true,
        lastSync: new Date().toISOString(),
      },
    })

    await expect(
      payload.delete({
        collection: 'playlists',
        id: created.id,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('authenticatedOrPublished on Shows drafts', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'shows')
  })

  it('hides a draft show from an unauthenticated request', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'shows',
      data: { title: 'Unpublished Show', _status: 'draft' },
      draft: true,
    })

    const { docs } = await payload.find({
      collection: 'shows',
      overrideAccess: false,
      draft: true,
    })
    expect(docs).toHaveLength(0)
  })

  it('shows a draft show to an authenticated request', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'shows',
      data: { title: 'Unpublished Show', _status: 'draft' },
      draft: true,
    })

    const { docs } = await payload.find({
      collection: 'shows',
      overrideAccess: false,
      draft: true,
      // Passing any truthy `user` is enough to exercise the access-control
      // branch - authenticatedOrPublished only checks req.user's presence,
      // it doesn't re-verify the session.
      user: { collection: 'users', id: 'fake-user-id' } as any,
    })
    expect(docs).toHaveLength(1)
  })
})
