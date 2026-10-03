import { afterEach, describe, expect, it } from 'vitest'

import { deleteAll, getTestPayload } from './helpers/payload'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

describe('Episodes access control and show-ownership enforcement', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
    await deleteAll(payload, 'hosts')
  })

  it('lets a host create an episode on their assigned show', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const showA = await payload.create({
      collection: 'shows',
      data: { title: 'Show A', hosts: [hostA.id], _status: 'draft' },
      draft: true,
    })

    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    const episode = await payload.create({
      collection: 'episodes',
      draft: true,
      overrideAccess: false,
      user: hostUserA,
      data: {
        title: 'Episode 1',
        show: showA.id,
        dateAired: new Date().toISOString(),
        _status: 'draft',
      },
    })

    expect(episode.title).toBe('Episode 1')
  })

  it('rejects a host creating an episode on a show they do not manage', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostB = await payload.create({ collection: 'hosts', data: { title: 'Host B' } })
    const showB = await payload.create({
      collection: 'shows',
      data: { title: 'Show B', hosts: [hostB.id], _status: 'draft' },
      draft: true,
    })

    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    await expect(
      payload.create({
        collection: 'episodes',
        draft: true,
        overrideAccess: false,
        user: hostUserA,
        data: {
          title: 'Hijacked Episode',
          show: showB.id,
          dateAired: new Date().toISOString(),
          _status: 'draft',
        },
      }),
    ).rejects.toThrow()
  })

  it('rejects a host re-pointing their own episode at a show they do not manage', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostB = await payload.create({ collection: 'hosts', data: { title: 'Host B' } })
    const showA = await payload.create({
      collection: 'shows',
      data: { title: 'Show A', hosts: [hostA.id], _status: 'draft' },
      draft: true,
    })
    const showB = await payload.create({
      collection: 'shows',
      data: { title: 'Show B', hosts: [hostB.id], _status: 'draft' },
      draft: true,
    })

    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    const episode = await payload.create({
      collection: 'episodes',
      draft: true,
      user: adminUser,
      data: {
        title: 'Episode 1',
        show: showA.id,
        dateAired: new Date().toISOString(),
        _status: 'draft',
      },
    })

    await expect(
      payload.update({
        collection: 'episodes',
        id: episode.id,
        draft: true,
        overrideAccess: false,
        user: hostUserA,
        data: { show: showB.id },
      }),
    ).rejects.toThrow()
  })

  it('lets a host read back their own draft episode created before a show was picked', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    // Mirrors what autosave does: title filled in, `show` not chosen yet.
    const draft = await payload.create({
      collection: 'episodes',
      draft: true,
      overrideAccess: false,
      user: hostUserA,
      data: {
        title: 'Episode before show picked',
        dateAired: new Date().toISOString(),
      },
    })

    await expect(
      payload.findByID({
        collection: 'episodes',
        id: draft.id,
        draft: true,
        overrideAccess: false,
        user: hostUserA,
      }),
    ).resolves.toMatchObject({ id: draft.id })
  })

  it('hides another host\'s still-showless draft episode', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostB = await payload.create({ collection: 'hosts', data: { title: 'Host B' } })
    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any
    const hostUserB = { collection: 'users', id: 'fake-host-b', roles: ['host'], host: hostB.id } as any

    const draft = await payload.create({
      collection: 'episodes',
      draft: true,
      overrideAccess: false,
      user: hostUserA,
      data: {
        title: 'Episode before show picked',
        dateAired: new Date().toISOString(),
      },
    })

    await expect(
      payload.findByID({
        collection: 'episodes',
        id: draft.id,
        draft: true,
        overrideAccess: false,
        user: hostUserB,
      }),
    ).rejects.toThrow()
  })

  it('lets a host set the show on their own draft after the fact', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const showA = await payload.create({
      collection: 'shows',
      data: { title: 'Show A', hosts: [hostA.id], _status: 'draft' },
      draft: true,
    })
    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    const draft = await payload.create({
      collection: 'episodes',
      draft: true,
      overrideAccess: false,
      user: hostUserA,
      data: {
        title: 'Episode before show picked',
        dateAired: new Date().toISOString(),
      },
    })

    const updated = await payload.update({
      collection: 'episodes',
      id: draft.id,
      draft: true,
      overrideAccess: false,
      user: hostUserA,
      data: { show: showA.id },
    })

    expect(typeof updated.show === 'object' ? updated.show?.id : updated.show).toBe(showA.id)
  })

  it('shows only published episodes to anonymous requests, and all to admin', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })

    await payload.create({
      collection: 'episodes',
      draft: true,
      user: adminUser,
      data: {
        title: 'Draft Episode',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'draft',
      },
    })
    await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Published Episode',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
      },
    })

    const anon = await payload.find({
      collection: 'episodes',
      overrideAccess: false,
      draft: true,
    })
    expect(anon.docs.map((d) => d.title)).toEqual(['Published Episode'])

    const admin = await payload.find({
      collection: 'episodes',
      overrideAccess: false,
      draft: true,
      user: adminUser,
    })
    expect(admin.docs.map((d) => d.title).sort()).toEqual(['Draft Episode', 'Published Episode'])
  })
})
