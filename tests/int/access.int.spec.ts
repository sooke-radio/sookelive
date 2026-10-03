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

describe('Shows read access on drafts (readShows in src/collections/Shows/index.ts)', () => {
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

  it('shows a draft show to an admin request', async () => {
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
      // roles: ['admin'] is required now - a plain authenticated user with
      // no roles (e.g. an unassigned host) only sees published shows.
      user: { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any,
    })
    expect(docs).toHaveLength(1)
  })

  it('hides a draft show from an authenticated non-admin, non-host user', async () => {
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
      user: { collection: 'users', id: 'fake-host-id', roles: ['host'] } as any,
    })
    expect(docs).toHaveLength(0)
  })
})

describe.each(['header', 'footer'] as const)('%s global access control', (slug) => {
  it('allows unauthenticated reads', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.findGlobal({ slug, overrideAccess: false }),
    ).resolves.toBeDefined()
  })

  it('rejects update from an unauthenticated request', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.updateGlobal({
        slug,
        overrideAccess: false,
        data: {},
      }),
    ).rejects.toThrow()
  })

  it('rejects update from a host user', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.updateGlobal({
        slug,
        overrideAccess: false,
        data: {},
        user: { collection: 'users', id: 'fake-host-id', roles: ['host'] } as any,
      }),
    ).rejects.toThrow()
  })

  it('allows update from an admin user', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.updateGlobal({
        slug,
        overrideAccess: false,
        data: {},
        user: { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any,
      }),
    ).resolves.toBeDefined()
  })
})
