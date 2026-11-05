import { describe, expect, it } from 'vitest'

import { addXingHeader, isMp3Upload } from './mp3Xing'

// MPEG1 Layer III, 128kbps, 44.1kHz, stereo, no padding -> 417-byte frames.
const FRAME_LENGTH = 417
const makeFrame = (fill = 0x11) => {
  const frame = Buffer.alloc(FRAME_LENGTH, fill)
  frame.set([0xff, 0xfb, 0x90, 0x00], 0)
  return frame
}
const makeMp3 = (frames: number, id3 = false) => {
  const parts: Buffer[] = []
  if (id3) {
    const tag = Buffer.alloc(10 + 100)
    tag.write('ID3', 0, 'latin1')
    tag[3] = 3
    tag[9] = 100 // syncsafe size
    parts.push(tag)
  }
  for (let i = 0; i < frames; i++) parts.push(makeFrame(i % 200))
  return Buffer.concat(parts)
}

describe('addXingHeader', () => {
  it('inserts an Info frame before the first audio frame, leaving audio untouched', () => {
    const mp3 = makeMp3(50, true)
    const out = addXingHeader(mp3)
    expect(out).not.toBeNull()
    const audioStart = 110
    // ID3 tag preserved
    expect(out!.subarray(0, audioStart).equals(mp3.subarray(0, audioStart))).toBe(true)
    // Info frame sits right after the tag: header + 32 side-info bytes, then the tag
    expect(out!.toString('latin1', audioStart + 36, audioStart + 40)).toBe('Info')
    const flags = out!.readUInt32BE(audioStart + 40)
    expect(flags).toBe(0x07)
    expect(out!.readUInt32BE(audioStart + 44)).toBe(50) // frame count
    // Original audio follows the info frame byte-for-byte
    const infoLength = out!.length - mp3.length
    expect(infoLength).toBeGreaterThanOrEqual(36 + 4 + 12 + 100)
    expect(out!.subarray(audioStart + infoLength).equals(mp3.subarray(audioStart))).toBe(true)
    // Byte count covers audio + the info frame
    expect(out!.readUInt32BE(audioStart + 48)).toBe(50 * FRAME_LENGTH + infoLength)
  })

  it('works on files with no ID3 tag', () => {
    const out = addXingHeader(makeMp3(20))
    expect(out).not.toBeNull()
    expect(out!.toString('latin1', 36, 40)).toBe('Info')
  })

  it('is idempotent: a file that already has a header is left alone', () => {
    const once = addXingHeader(makeMp3(30))!
    expect(addXingHeader(once)).toBeNull()
  })

  it('ignores data that is not a Layer III MP3', () => {
    expect(addXingHeader(Buffer.from('RIFF....WAVEfmt '))).toBeNull()
    expect(addXingHeader(Buffer.alloc(0))).toBeNull()
    expect(addXingHeader(makeMp3(2))).toBeNull() // too short to trust
  })

  it('tolerates a trailing ID3v1 tag', () => {
    const tag = Buffer.alloc(128)
    tag.write('TAG', 0, 'latin1')
    const mp3 = Buffer.concat([makeMp3(40), tag])
    const out = addXingHeader(mp3)
    expect(out).not.toBeNull()
    expect(out!.readUInt32BE(44)).toBe(40)
  })
})

describe('isMp3Upload', () => {
  it('matches by mimetype or extension', () => {
    expect(isMp3Upload({ mimetype: 'audio/mpeg', name: 'x' })).toBe(true)
    expect(isMp3Upload({ name: 'Show.MP3' })).toBe(true)
    expect(isMp3Upload({ mimetype: 'audio/wav', name: 'x.wav' })).toBe(false)
  })
})
