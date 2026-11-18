import type { Where } from 'payload'

// filterOptions for upload fields pointing at `media`: only offer images in
// the "select from existing" list (audio belongs in `episode-audio`).
export const imageOnly: Where = { mimeType: { contains: 'image/' } }

// For fields that can also take video (MediaBlock renders VideoMedia).
export const imageOrVideo: Where = {
  or: [{ mimeType: { contains: 'image/' } }, { mimeType: { contains: 'video/' } }],
}
