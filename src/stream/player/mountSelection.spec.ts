import { describe, expect, it } from 'vitest'
import { selectMount } from './mountSelection'
import type { AzuracastMount } from '@/stream/azuracast/types'

const mount = (overrides: Partial<AzuracastMount>): AzuracastMount => ({
  id: 1,
  name: 'HQ Opus',
  url: 'https://stream.sooke.live/listen/sookelive/high_192kbps.mp3',
  bitrate: 128,
  format: 'opus',
  is_default: true,
  path: '/high_192kbps.mp3',
  ...overrides,
})

describe('selectMount', () => {
  it('returns undefined when there are no mounts', () => {
    expect(selectMount([], null)).toBeUndefined()
    expect(selectMount([], 5)).toBeUndefined()
  })

  it('returns the preferred mount when its id matches', () => {
    const mounts = [mount({ id: 1, is_default: true }), mount({ id: 2, is_default: false })]
    expect(selectMount(mounts, 2)?.id).toBe(2)
  })

  it('falls back to the default mount when no preferred id is set', () => {
    const mounts = [mount({ id: 1, is_default: false }), mount({ id: 2, is_default: true })]
    expect(selectMount(mounts, null)?.id).toBe(2)
  })

  it('falls back to the default mount when the preferred id no longer exists', () => {
    // e.g. the user's stored preference pointed at a mount later removed in Azuracast
    const mounts = [mount({ id: 1, is_default: false }), mount({ id: 2, is_default: true })]
    expect(selectMount(mounts, 999)?.id).toBe(2)
  })

  it('falls back to the first mount when none is marked default', () => {
    const mounts = [mount({ id: 1, is_default: false }), mount({ id: 2, is_default: false })]
    expect(selectMount(mounts, null)?.id).toBe(1)
  })
})
