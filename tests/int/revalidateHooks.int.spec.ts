import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath, revalidateTag } from 'next/cache'
import { deleteAll, getTestPayload } from './helpers/payload'

describe('Playlists revalidate hooks', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear()
    vi.mocked(revalidateTag).mockClear()
  })

  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'playlists')
  })

  it('revalidates /schedule, "shows", and "playlists" when a playlist is created', async () => {
    const payload = await getTestPayload()

    await payload.create({
      collection: 'playlists',
      data: {
        az_id: 1,
        name: 'Morning Show',
        short_name: 'morning_show',
        lastSync: new Date().toISOString(),
      },
    })

    expect(revalidatePath).toHaveBeenCalledWith('/schedule')
    expect(revalidateTag).toHaveBeenCalledWith('shows')
    expect(revalidateTag).toHaveBeenCalledWith('playlists')
  })

  it('revalidates the same targets when a playlist is deleted', async () => {
    const payload = await getTestPayload()
    const created = await payload.create({
      collection: 'playlists',
      data: {
        az_id: 2,
        name: 'Evening Mix',
        short_name: 'evening_mix',
        lastSync: new Date().toISOString(),
      },
    })

    vi.mocked(revalidatePath).mockClear()
    vi.mocked(revalidateTag).mockClear()

    await payload.delete({ collection: 'playlists', id: created.id })

    expect(revalidatePath).toHaveBeenCalledWith('/schedule')
    expect(revalidateTag).toHaveBeenCalledWith('shows')
    expect(revalidateTag).toHaveBeenCalledWith('playlists')
  })

  it('skips revalidation when context.disableRevalidate is set', async () => {
    const payload = await getTestPayload()

    await payload.create({
      collection: 'playlists',
      data: {
        az_id: 3,
        name: 'No Revalidate',
        short_name: 'no_revalidate',
        lastSync: new Date().toISOString(),
      },
      context: { disableRevalidate: true },
    })

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
