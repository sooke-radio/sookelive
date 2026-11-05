import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteAll, getTestPayload } from './helpers/payload'

// A real user document: episodes referencing audio query the users collection,
// which chokes on the fake non-ObjectId ids other specs use.
let adminUser: any

const makeShow = async (title: string) => {
  const payload = await getTestPayload()
  return payload.create({
    collection: 'shows',
    data: { title, _status: 'draft' },
    draft: true,
  })
}

const makeAudio = async (name: string) => {
  const payload = await getTestPayload()
  // A few valid MPEG1 Layer III frames (128kbps/44.1kHz) so Payload's content
  // sniffing accepts it as audio/mpeg.
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0x00], 0)
  const data = Buffer.concat(Array.from({ length: 8 }, () => frame))
  return payload.create({
    collection: 'episode-audio',
    data: {},
    file: { data, mimetype: 'audio/mpeg', name, size: data.length },
    overrideAccess: true,
  })
}

const makeEpisode = async (title: string, show: string, audio?: string) => {
  const payload = await getTestPayload()
  return payload.create({
    collection: 'episodes',
    user: adminUser,
    data: {
      title,
      show,
      audio,
      dateAired: new Date().toISOString(),
      _status: 'published',
    },
  })
}

const showsOf = async (audioId: string) => {
  const payload = await getTestPayload()
  const audio = await payload.findByID({ collection: 'episode-audio', id: audioId, depth: 0 })
  return ((audio.show ?? []) as string[]).slice().sort()
}

describe('episode-audio show sync', () => {
  beforeEach(async () => {
    const payload = await getTestPayload()
    const user = await payload.create({
      collection: 'users',
      data: { email: `admin-${Date.now()}@test.dev`, password: 'test-password-1', roles: ['admin'] },
    })
    adminUser = { ...user, collection: 'users' }
  })

  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'episode-audio')
    await deleteAll(payload, 'shows')
    await deleteAll(payload, 'users')
  })

  it('leaves show empty for unused audio', async () => {
    const audio = await makeAudio('unused.mp3')
    expect(await showsOf(audio.id)).toEqual([])
  })

  it("sets the audio's show from the episode it is attached to", async () => {
    const show = await makeShow('Show A')
    const audio = await makeAudio('a.mp3')
    await makeEpisode('Episode 1', show.id, audio.id)
    expect(await showsOf(audio.id)).toEqual([show.id])
  })

  it('collects every show whose episodes use the file, without duplicates', async () => {
    const [a, b] = [await makeShow('Show A'), await makeShow('Show B')]
    const audio = await makeAudio('shared.mp3')
    await makeEpisode('E1', a.id, audio.id)
    await makeEpisode('E2', a.id, audio.id)
    await makeEpisode('E3', b.id, audio.id)
    expect(await showsOf(audio.id)).toEqual([a.id, b.id].sort())
  })

  it("follows an episode's show change", async () => {
    const [a, b] = [await makeShow('Show A'), await makeShow('Show B')]
    const audio = await makeAudio('move.mp3')
    const episode = await makeEpisode('E1', a.id, audio.id)

    const payload = await getTestPayload()
    await payload.update({
      collection: 'episodes',
      id: episode.id,
      user: adminUser,
      data: { show: b.id, _status: 'published' },
    })
    expect(await showsOf(audio.id)).toEqual([b.id])
  })

  it('drops the show from a file that is swapped out of the episode', async () => {
    const show = await makeShow('Show A')
    const oldAudio = await makeAudio('old.mp3')
    const newAudio = await makeAudio('new.mp3')
    const episode = await makeEpisode('E1', show.id, oldAudio.id)

    const payload = await getTestPayload()
    await payload.update({
      collection: 'episodes',
      id: episode.id,
      user: adminUser,
      data: { audio: newAudio.id, _status: 'published' },
    })
    expect(await showsOf(oldAudio.id)).toEqual([])
    expect(await showsOf(newAudio.id)).toEqual([show.id])
  })

  it('drops the show when the episode is deleted', async () => {
    const show = await makeShow('Show A')
    const audio = await makeAudio('del.mp3')
    const episode = await makeEpisode('E1', show.id, audio.id)

    const payload = await getTestPayload()
    await payload.delete({ collection: 'episodes', id: episode.id, user: adminUser })
    expect(await showsOf(audio.id)).toEqual([])
  })
})
