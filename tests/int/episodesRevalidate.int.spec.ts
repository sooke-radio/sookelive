import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath, revalidateTag } from 'next/cache'
import { deleteAll, getTestPayload } from './helpers/payload'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

describe('Episodes revalidate hooks', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear()
    vi.mocked(revalidateTag).mockClear()
  })

  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
  })

  it('revalidates the episode, index, sitemap, and parent show when published', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })

    const episode = await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Published Episode',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
      },
    })

    expect(revalidatePath).toHaveBeenCalledWith(`/episodes/${episode.slug}`)
    expect(revalidatePath).toHaveBeenCalledWith('/episodes')
    expect(revalidatePath).toHaveBeenCalledWith(`/shows/${show.slug}`)
    expect(revalidateTag).toHaveBeenCalledWith('episodes', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('episodes-sitemap', 'max')
  })

  it('does not revalidate when the episode is only saved as a draft', async () => {
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

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates the same targets when a published episode is deleted', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })

    const episode = await payload.create({
      collection: 'episodes',
      user: adminUser,
      data: {
        title: 'Published Episode',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
      },
    })

    vi.mocked(revalidatePath).mockClear()
    vi.mocked(revalidateTag).mockClear()

    await payload.delete({ collection: 'episodes', id: episode.id })

    expect(revalidatePath).toHaveBeenCalledWith(`/episodes/${episode.slug}`)
    expect(revalidatePath).toHaveBeenCalledWith('/episodes')
    expect(revalidatePath).toHaveBeenCalledWith(`/shows/${show.slug}`)
    expect(revalidateTag).toHaveBeenCalledWith('episodes', 'max')
    expect(revalidateTag).toHaveBeenCalledWith('episodes-sitemap', 'max')
  })

  it('skips revalidation when context.disableRevalidate is set', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', _status: 'draft' },
      draft: true,
    })

    await payload.create({
      collection: 'episodes',
      user: adminUser,
      context: { disableRevalidate: true },
      data: {
        title: 'Published Episode',
        show: show.id,
        dateAired: new Date().toISOString(),
        _status: 'published',
      },
    })

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
