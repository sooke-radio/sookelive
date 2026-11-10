import { afterEach, describe, expect, it } from 'vitest'
import { deleteAll, getTestPayload } from './helpers/payload'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('Episode card image (meta.image)', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })

  it('returns a populated meta.image when listing published episodes', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'card' },
      file: { data: PNG, mimetype: 'image/png', name: 'card-test.png', size: PNG.length },
    })
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })
    await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'With Image',
        show: show.id,
        dateAired: new Date().toISOString(),
        meta: { image: media.id },
        _status: 'published',
      },
    })

    const result = await payload.find({
      collection: 'episodes',
      depth: 1,
      overrideAccess: false,
      where: { show: { equals: show.id }, _status: { equals: 'published' } },
    })

    const image = result.docs[0]?.meta?.image
    expect(image).toBeTypeOf('object')
    expect((image as { url?: string }).url).toBeTruthy()

    const selected = await payload.find({
      collection: 'episodes',
      depth: 1,
      overrideAccess: false,
      select: { title: true, slug: true, meta: true },
    })
    expect(selected.docs[0]?.meta?.image).toBeTypeOf('object')
  })

  it('treats an existing meta.image as the thumbnail (legacy docs)', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'legacy' },
      file: { data: PNG, mimetype: 'image/png', name: 'legacy.png', size: PNG.length },
    })
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })
    // Legacy shape: only meta.image, no thumbnail.
    const created = await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Legacy',
        show: show.id,
        dateAired: new Date().toISOString(),
        meta: { image: media.id },
        _status: 'published',
      },
    })

    const read = await payload.findByID({ collection: 'episodes', id: created.id, depth: 0 })
    expect(read.thumbnail).toBe(media.id)

    // An edit that doesn't send thumbnail keeps meta.image.
    const renamed = await payload.update({
      collection: 'episodes',
      id: created.id,
      user: adminUser,
      data: { title: 'Legacy renamed' },
      depth: 0,
    })
    expect(renamed.meta?.image).toBe(media.id)
    expect(renamed.meta?.title).toBe('Legacy renamed')

    // The admin round-trip (form sends the fallback thumbnail back) keeps it too.
    const resaved = await payload.update({
      collection: 'episodes',
      id: created.id,
      user: adminUser,
      data: { thumbnail: read.thumbnail as string },
      depth: 0,
    })
    expect(resaved.meta?.image).toBe(media.id)

    // Explicitly clearing it clears both.
    const cleared = await payload.update({
      collection: 'episodes',
      id: created.id,
      user: adminUser,
      data: { thumbnail: null },
      depth: 0,
    })
    expect(cleared.meta?.image ?? null).toBeNull()
    expect(cleared.thumbnail ?? null).toBeNull()
  })
})
