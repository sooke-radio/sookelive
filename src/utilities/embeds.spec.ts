import { describe, expect, it } from 'vitest'

import { normalizeEmbedUrl } from './embeds'

describe('normalizeEmbedUrl - youtube', () => {
  const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ])('normalizes %s', (input) => {
    expect(normalizeEmbedUrl('youtube', input)).toBe(expected)
  })

  it('extracts the src from pasted iframe code', () => {
    const iframe = `<iframe width="560" src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc" title="x"></iframe>`
    expect(normalizeEmbedUrl('youtube', iframe)).toBe(expected)
  })

  it.each([
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://evil.example/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/',
    'javascript:alert(1)',
    'not a url',
    '',
  ])('rejects %s', (input) => {
    expect(normalizeEmbedUrl('youtube', input)).toBeNull()
  })
})

describe('normalizeEmbedUrl - soundcloud', () => {
  const widget = (url: string) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`

  it('wraps a track page URL in the widget player', () => {
    expect(normalizeEmbedUrl('soundcloud', 'https://soundcloud.com/artist/track?si=abc')).toBe(
      widget('https://soundcloud.com/artist/track'),
    )
  })

  it('keeps the inner URL of a pasted widget iframe', () => {
    const iframe = `<iframe src="${widget('https://api.soundcloud.com/tracks/123')}&color=%23ff5500"></iframe>`
    expect(normalizeEmbedUrl('soundcloud', iframe)).toBe(
      widget('https://api.soundcloud.com/tracks/123'),
    )
  })

  it.each([
    'https://soundcloud.com/',
    'https://evil.example/artist/track',
    'https://w.soundcloud.com/player/?url=https%3A%2F%2Fevil.example%2Fx',
    'http://soundcloud.com/artist/track',
  ])('rejects %s', (input) => {
    expect(normalizeEmbedUrl('soundcloud', input)).toBeNull()
  })
})

describe('normalizeEmbedUrl - mixcloud', () => {
  const widget = (feed: string) =>
    `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(feed)}`

  it('wraps a show page URL in the widget player', () => {
    expect(normalizeEmbedUrl('mixcloud', 'https://www.mixcloud.com/someuser/some-show/')).toBe(
      widget('/someuser/some-show/'),
    )
  })

  it('keeps the feed of a pasted widget iframe, dropping extra params', () => {
    const src =
      'https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2Fsomeuser%2Fsome-show%2F'
    expect(normalizeEmbedUrl('mixcloud', `<iframe src="${src}"></iframe>`)).toBe(
      widget('/someuser/some-show/'),
    )
  })

  it.each([
    'https://www.mixcloud.com/someuser/',
    'https://www.mixcloud.com/widget/iframe/?feed=%2F%2Fevil.example%2Fx',
    'https://www.mixcloud.com/widget/iframe/',
    'https://evil.example/someuser/some-show/',
  ])('rejects %s', (input) => {
    expect(normalizeEmbedUrl('mixcloud', input)).toBeNull()
  })
})
