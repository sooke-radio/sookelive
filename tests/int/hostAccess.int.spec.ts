import { afterEach, describe, expect, it } from 'vitest'

import { deleteAll, getTestPayload } from './helpers/payload'

// Minimal valid Lexical value for required richText `content` fields.
const minimalContent = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'placeholder', version: 1 }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
} as any

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

describe('Host role access matrix', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'shows')
    await deleteAll(payload, 'posts')
    await deleteAll(payload, 'hosts')
    await deleteAll(payload, 'users')
  })

  it('host sees their assigned (draft) show and published shows, not another host\'s draft show', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostB = await payload.create({ collection: 'hosts', data: { title: 'Host B' } })

    await payload.create({
      collection: 'shows',
      data: { title: 'Show A', hosts: [hostA.id], _status: 'draft' },
      draft: true,
    })
    await payload.create({
      collection: 'shows',
      data: { title: 'Show B', hosts: [hostB.id], _status: 'draft' },
      draft: true,
    })
    await payload.create({
      collection: 'shows',
      data: { title: 'Show C', content: minimalContent, _status: 'published' },
    })

    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    const { docs } = await payload.find({
      collection: 'shows',
      overrideAccess: false,
      draft: true,
      user: hostUserA,
    })

    expect(docs.map((d) => d.title).sort()).toEqual(['Show A', 'Show C'])
  })

  it('host can update their assigned show but not another host\'s show', async () => {
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

    await expect(
      payload.update({
        collection: 'shows',
        id: showA.id,
        draft: true,
        overrideAccess: false,
        user: hostUserA,
        data: { title: 'Show A Updated' },
      }),
    ).resolves.toBeDefined()

    await expect(
      payload.update({
        collection: 'shows',
        id: showB.id,
        draft: true,
        overrideAccess: false,
        user: hostUserA,
        data: { title: 'Hijacked' },
      }),
    ).rejects.toThrow()
  })

  it('strips host edits to admin-only fields (hosts, streamer_id) on their own show', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostB = await payload.create({ collection: 'hosts', data: { title: 'Host B' } })

    const showA = await payload.create({
      collection: 'shows',
      data: {
        title: 'Show A',
        hosts: [hostA.id],
        streamer_id: 'original-streamer',
        _status: 'draft',
      },
      draft: true,
    })

    const hostUserA = { collection: 'users', id: 'fake-host-a', roles: ['host'], host: hostA.id } as any

    const updated = await payload.update({
      collection: 'shows',
      id: showA.id,
      draft: true,
      depth: 0,
      overrideAccess: false,
      user: hostUserA,
      data: {
        title: 'Show A - edited by host',
        hosts: [hostB.id],
        streamer_id: 'hijacked-streamer',
      },
    })

    expect(updated.title).toBe('Show A - edited by host')
    expect(updated.streamer_id).toBe('original-streamer')
    expect((updated.hosts as string[])?.map(String)).toEqual([String(hostA.id)])
  })

  it('rejects a host creating a post (admin-only collection)', async () => {
    const payload = await getTestPayload()
    const hostUser = { collection: 'users', id: 'fake-host', roles: ['host'] } as any

    await expect(
      payload.create({
        collection: 'posts',
        overrideAccess: false,
        user: hostUser,
        data: { title: 'Host post attempt', content: minimalContent },
      }),
    ).rejects.toThrow()
  })

  it('strips a self-escalation attempt (host patching their own roles to admin)', async () => {
    const payload = await getTestPayload()
    const hostA = await payload.create({ collection: 'hosts', data: { title: 'Host A' } })
    const hostUserDoc = await payload.create({
      collection: 'users',
      data: {
        email: 'host-a@example.test',
        password: 'test-password-123',
        roles: ['host'],
        host: hostA.id,
      },
    })

    const hostUser = { ...hostUserDoc, collection: 'users' } as any

    await payload.update({
      collection: 'users',
      id: hostUserDoc.id,
      overrideAccess: false,
      user: hostUser,
      data: { roles: ['admin'] },
    })

    const refetched = await payload.findByID({ collection: 'users', id: hostUserDoc.id })
    expect(refetched.roles).toEqual(['host'])
  })

  it('shows only published shows to anonymous requests, and all shows to admin', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'shows',
      data: { title: 'Draft Show', _status: 'draft' },
      draft: true,
    })
    await payload.create({
      collection: 'shows',
      data: { title: 'Published Show', content: minimalContent, _status: 'published' },
    })

    const anon = await payload.find({ collection: 'shows', overrideAccess: false, draft: true })
    expect(anon.docs.map((d) => d.title)).toEqual(['Published Show'])

    const admin = await payload.find({
      collection: 'shows',
      overrideAccess: false,
      draft: true,
      user: adminUser,
    })
    expect(admin.docs.map((d) => d.title).sort()).toEqual(['Draft Show', 'Published Show'])
  })
})
