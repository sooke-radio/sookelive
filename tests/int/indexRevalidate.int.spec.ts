import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { deleteAll, getTestPayload } from './helpers/payload'
import { minimalContent } from './helpers/fixtures'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

describe('Index/archive page revalidation', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear()
  })

  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'posts')
    await deleteAll(payload, 'shows')
  })

  it('publishing a post revalidates /posts and its paginated pages', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'posts',
      user: adminUser,
      data: { title: 'Post', content: minimalContent, _status: 'published' },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/posts')
    expect(revalidatePath).toHaveBeenCalledWith('/posts/page/[pageNumber]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('publishing a show revalidates /shows and its paginated pages', async () => {
    const payload = await getTestPayload()
    await payload.create({
      collection: 'shows',
      user: adminUser,
      data: { title: 'Show', content: minimalContent, _status: 'published' },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/shows')
    expect(revalidatePath).toHaveBeenCalledWith('/shows/page/[pageNumber]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/shows/[slug]/page/[pageNumber]', 'page')
  })

  it('publishing an episode revalidates the home page and paginated episodes', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', content: minimalContent, _status: 'draft' },
      draft: true,
    })
    await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Ep',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
      },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/episodes/page/[pageNumber]', 'page')
  })

  it('unpublishing an episode revalidates its page', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', content: minimalContent, _status: 'draft' },
      draft: true,
    })
    const episode = await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Ep',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
      },
    })
    vi.mocked(revalidatePath).mockClear()

    await payload.update({
      collection: 'episodes',
      id: episode.id,
      user: adminUser,
      data: { _status: 'draft' },
    })

    expect(revalidatePath).toHaveBeenCalledWith(`/episodes/${episode.slug}`)
    expect(revalidatePath).toHaveBeenCalledWith('/episodes')
  })
})

describe('Media revalidation', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear()
  })

  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  afterEach(async () => {
    const payload = await getTestPayload()
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })

  it('revalidates the whole site when media is updated, not when created', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'one' },
      file: { data: PNG, mimetype: 'image/png', name: 'rv-test.png', size: PNG.length },
    })
    expect(revalidatePath).not.toHaveBeenCalledWith('/', 'layout')

    await payload.update({ collection: 'media', id: media.id, data: { alt: 'two' } })
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })
})
