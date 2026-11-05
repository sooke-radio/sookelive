/**
 * Lossless MP3 "Xing/Info" header injection.
 *
 * MP3s without a Xing/Info/VBRI header give players no duration or seek index,
 * so Firefox scans the whole file before it can start playing (Chromium just
 * estimates). This inserts a silent first frame carrying that header (frame
 * count, byte count and a 100-point seek table) in front of the first audio
 * frame. Audio frames are copied untouched - nothing is re-encoded.
 */

type FrameInfo = {
  bitrateIndex: number
  channelMode: number
  crc: boolean
  frameLength: number
  header: Buffer
  isMpeg1: boolean
  samplesPerFrame: number
  sampleRateIndex: number
  sideInfoSize: number
  versionBits: number
}

const BITRATES_MPEG1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const BITRATES_MPEG2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES: Record<number, number[]> = {
  0: [11025, 12000, 8000], // MPEG 2.5
  2: [22050, 24000, 16000], // MPEG 2
  3: [44100, 48000, 32000], // MPEG 1
}

const TOC_SIZE = 100
const XING_BODY_SIZE = 4 + 4 + 4 + 4 + TOC_SIZE // tag + flags + frames + bytes + toc

/** Parses an MPEG audio Layer III frame header at `offset`, or null if invalid. */
const parseFrame = (buf: Buffer, offset: number): FrameInfo | null => {
  if (offset + 4 > buf.length) return null
  const b0 = buf[offset]
  const b1 = buf[offset + 1]
  const b2 = buf[offset + 2]
  const b3 = buf[offset + 3]
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null

  const versionBits = (b1 >> 3) & 3
  const layerBits = (b1 >> 1) & 3
  if (versionBits === 1 || layerBits !== 1) return null // reserved version / not Layer III

  const bitrateIndex = b2 >> 4
  const sampleRateIndex = (b2 >> 2) & 3
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null

  const isMpeg1 = versionBits === 3
  const bitrate = (isMpeg1 ? BITRATES_MPEG1_L3 : BITRATES_MPEG2_L3)[bitrateIndex]
  const sampleRate = SAMPLE_RATES[versionBits][sampleRateIndex]
  const padding = (b2 >> 1) & 1
  const frameLength = Math.floor(((isMpeg1 ? 144 : 72) * bitrate * 1000) / sampleRate) + padding
  const channelMode = b3 >> 6
  const mono = channelMode === 3

  return {
    bitrateIndex,
    channelMode,
    crc: (b1 & 1) === 0,
    frameLength,
    header: buf.subarray(offset, offset + 4),
    isMpeg1,
    samplesPerFrame: isMpeg1 ? 1152 : 576,
    sampleRateIndex,
    sideInfoSize: isMpeg1 ? (mono ? 17 : 32) : mono ? 9 : 17,
    versionBits,
  }
}

/** Byte offset just past a leading ID3v2 tag (0 if none). */
const skipId3v2 = (buf: Buffer): number => {
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size =
      ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
    const footer = buf[5] & 0x10 ? 10 : 0
    return 10 + size + footer
  }
  return 0
}

/** First offset (>= start) holding a run of valid, consecutive frames. */
const findFirstFrame = (buf: Buffer, start: number): { frame: FrameInfo; offset: number } | null => {
  const limit = Math.min(buf.length - 4, start + 64 * 1024) // don't hunt forever
  for (let i = start; i < limit; i++) {
    if (buf[i] !== 0xff) continue
    const frame = parseFrame(buf, i)
    if (!frame) continue
    // Confirm with the next two frames to avoid false sync matches.
    const second = parseFrame(buf, i + frame.frameLength)
    if (!second) continue
    const third = parseFrame(buf, i + frame.frameLength + second.frameLength)
    if (!third && i + frame.frameLength + second.frameLength < buf.length - 256) continue
    return { frame, offset: i }
  }
  return null
}

const hasInfoHeader = (buf: Buffer, offset: number, frame: FrameInfo): boolean => {
  const tagAt = offset + 4 + (frame.crc ? 2 : 0) + frame.sideInfoSize
  const tag = buf.toString('latin1', tagAt, tagAt + 4)
  if (tag === 'Xing' || tag === 'Info') return true
  return buf.toString('latin1', offset + 4 + 32, offset + 4 + 36) === 'VBRI'
}

/**
 * Returns a copy of `mp3` with an Info/Xing header frame inserted before the
 * first audio frame, or null when no change is needed or the file can't be
 * handled safely (not Layer III MP3, already has a header, unparseable).
 */
export const addXingHeader = (mp3: Buffer): Buffer | null => {
  const audioStart = skipId3v2(mp3)
  const first = findFirstFrame(mp3, audioStart)
  if (!first) return null
  const { frame, offset: firstFrameOffset } = first
  if (hasInfoHeader(mp3, firstFrameOffset, frame)) return null

  // Walk every frame: count them, find where audio ends (ID3v1/APE/garbage may
  // trail it), note per-frame offsets for the seek table, detect VBR.
  const offsets: number[] = []
  let pos = firstFrameOffset
  let isVbr = false
  while (pos < mp3.length) {
    const f = parseFrame(mp3, pos)
    if (!f || pos + f.frameLength > mp3.length) break
    if (f.bitrateIndex !== frame.bitrateIndex) isVbr = true
    offsets.push(pos - firstFrameOffset)
    pos += f.frameLength
  }
  const audioBytes = pos - firstFrameOffset
  const frameCount = offsets.length
  if (frameCount < 4) return null

  // Bail out if the walk ended early (lost sync) - a wrong header is worse than none.
  let trailing = mp3.length - pos
  if (trailing >= 128 && mp3.toString('latin1', mp3.length - 128, mp3.length - 125) === 'TAG') {
    trailing -= 128
  }
  if (trailing > 64 * 1024 && trailing > mp3.length * 0.01) return null

  // Info frame: same version/sample rate/channel mode as the audio, but a
  // bitrate large enough to hold the header body. No CRC, no padding.
  const table = frame.isMpeg1 ? BITRATES_MPEG1_L3 : BITRATES_MPEG2_L3
  const sampleRate = SAMPLE_RATES[frame.versionBits][frame.sampleRateIndex]
  const tagOffset = 4 + frame.sideInfoSize
  let infoBitrateIndex = 0
  let infoFrameLength = 0
  for (let i = 1; i < 15; i++) {
    const length = Math.floor(((frame.isMpeg1 ? 144 : 72) * table[i] * 1000) / sampleRate)
    if (length >= tagOffset + XING_BODY_SIZE) {
      infoBitrateIndex = i
      infoFrameLength = length
      break
    }
  }
  if (!infoBitrateIndex) return null

  const info = Buffer.alloc(infoFrameLength)
  info[0] = 0xff
  info[1] = 0xe0 | (frame.versionBits << 3) | (1 << 1) | 1 // layer III, no CRC
  info[2] = (infoBitrateIndex << 4) | (frame.sampleRateIndex << 2) // padding 0, private 0
  info[3] = frame.channelMode << 6
  info.write(isVbr ? 'Xing' : 'Info', tagOffset, 'latin1')
  info.writeUInt32BE(0x07, tagOffset + 4) // flags: frames + bytes + TOC
  info.writeUInt32BE(frameCount, tagOffset + 8)
  info.writeUInt32BE(audioBytes + infoFrameLength, tagOffset + 12)
  const totalAudio = audioBytes + infoFrameLength
  for (let i = 0; i < TOC_SIZE; i++) {
    const frameIndex = Math.min(frameCount - 1, Math.floor((i / TOC_SIZE) * frameCount))
    const byteOffset = offsets[frameIndex] + infoFrameLength
    info[tagOffset + 16 + i] = Math.min(255, Math.floor((byteOffset / totalAudio) * 256))
  }

  return Buffer.concat([mp3.subarray(0, firstFrameOffset), info, mp3.subarray(firstFrameOffset)])
}

/** Whether an upload looks like an MP3 worth processing. */
export const isMp3Upload = (file: { mimetype?: string; name?: string }): boolean =>
  file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3' || /\.mp3$/i.test(file.name ?? '')
