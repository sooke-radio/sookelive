import { afterEach, describe, expect, it } from 'vitest'
import { getTestPayload } from './helpers/payload'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('Media upload type restriction', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })

  it('accepts images', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'ok' },
        file: { data: PNG, mimetype: 'image/png', name: 'ok.png', size: PNG.length },
      }),
    ).resolves.toMatchObject({ mimeType: 'image/png' })
  })

  it('rejects audio files', async () => {
    const payload = await getTestPayload()
    const fakeMp3 = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0])
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'no' },
        file: { data: fakeMp3, mimetype: 'audio/mpeg', name: 'no.mp3', size: fakeMp3.length },
      }),
    ).rejects.toThrow()
  })
})

describe('Media video uploads', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })

  it('accepts video files', async () => {
    const payload = await getTestPayload()
    // Minimal MP4 'ftyp' box so type sniffing sees a real video container
    const mp4 = Buffer.from('0000001c6674797069736f6d0000020069736f6d69736f326d703431000000746d6f6f760000006c6d766864000000000000000000000000000003e8000000000001000001000000000000000000000000010000000000000000000000000000000100000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002', 'hex')
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'clip' },
        file: { data: mp4, mimetype: 'video/mp4', name: 'clip.mp4', size: mp4.length },
      }),
    ).resolves.toMatchObject({ mimeType: 'video/mp4' })
  })
})
