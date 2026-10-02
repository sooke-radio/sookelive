export const EMBED_PROVIDERS = ['youtube', 'soundcloud', 'mixcloud'] as const
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number]

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
])
const YOUTUBE_ID = /^[\w-]{11}$/

const SOUNDCLOUD_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'])
const SOUNDCLOUD_API_HOST = 'api.soundcloud.com'
const SOUNDCLOUD_WIDGET_HOST = 'w.soundcloud.com'

const MIXCLOUD_HOSTS = new Set(['mixcloud.com', 'www.mixcloud.com'])

// Editors may paste a bare URL or a provider's full <iframe> embed code.
const extractSrc = (input: string): string => {
  const trimmed = input.trim()
  const match = trimmed.match(/\ssrc\s*=\s*["']([^"']+)["']/i)
  return match ? match[1] : trimmed
}

const parseHttpsUrl = (input: string): URL | null => {
  try {
    const url = new URL(input)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

const normalizeYouTube = (url: URL): string | null => {
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null

  const segments = url.pathname.split('/').filter(Boolean)
  let id: string | undefined
  if (url.hostname === 'youtu.be') {
    id = segments[0]
  } else if (segments[0] === 'watch') {
    id = url.searchParams.get('v') ?? undefined
  } else if (['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    id = segments[1]
  }

  if (!id || !YOUTUBE_ID.test(id)) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}

const soundcloudWidget = (pageUrl: URL): string | null => {
  const isSoundCloud =
    SOUNDCLOUD_HOSTS.has(pageUrl.hostname) || pageUrl.hostname === SOUNDCLOUD_API_HOST
  if (!isSoundCloud || pageUrl.pathname.replace(/\//g, '') === '') return null

  return `https://${SOUNDCLOUD_WIDGET_HOST}/player/?url=${encodeURIComponent(`https://${pageUrl.hostname}${pageUrl.pathname}`)}`
}

const normalizeSoundCloud = (url: URL): string | null => {
  if (url.hostname === SOUNDCLOUD_WIDGET_HOST) {
    const inner = parseHttpsUrl(url.searchParams.get('url') ?? '')
    return inner ? soundcloudWidget(inner) : null
  }
  return soundcloudWidget(url)
}

const normalizeMixcloud = (url: URL): string | null => {
  if (!MIXCLOUD_HOSTS.has(url.hostname)) return null

  let path = url.pathname
  if (path.startsWith('/widget/iframe')) {
    path = url.searchParams.get('feed') ?? ''
  }

  // Expect /<user>/<show>/ - never allow scheme-relative or empty feeds.
  if (!path.startsWith('/') || path.startsWith('//')) return null
  const segments = path.split('/').filter(Boolean)
  if (segments.length < 2 || segments[0] === 'widget') return null

  return `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(`/${segments.join('/')}/`)}`
}

/**
 * Turns a pasted URL or `<iframe>` embed code into a canonical, allow-listed
 * embed src for the given provider, or `null` if it isn't a valid URL for
 * that provider. Only https URLs on known provider hosts are accepted, so the
 * result is safe to render as an iframe src.
 */
export const normalizeEmbedUrl = (provider: EmbedProvider, input: unknown): string | null => {
  if (typeof input !== 'string' || !input.trim()) return null

  const url = parseHttpsUrl(extractSrc(input))
  if (!url) return null

  switch (provider) {
    case 'youtube':
      return normalizeYouTube(url)
    case 'soundcloud':
      return normalizeSoundCloud(url)
    case 'mixcloud':
      return normalizeMixcloud(url)
    default:
      return null
  }
}

export const isEmbedProvider = (value: unknown): value is EmbedProvider =>
  typeof value === 'string' && (EMBED_PROVIDERS as readonly string[]).includes(value)
