import type { Sort, Where } from 'payload'

export type ArchiveCollection = 'episodes' | 'posts' | 'shows'

export const ARCHIVE_PER_PAGE = 12

// Bounds on user input: each word becomes one regex per search field (and
// relationship fields add a lookup query each), so keep the fan-out small.
export const MAX_QUERY_LENGTH = 100
export const MAX_QUERY_WORDS = 5

type ArchiveConfig = {
  baseUrl: string
  heading: string
  labels: { plural: string; singular: string }
  /** Field paths matched (case-insensitive substring) by the search box. */
  searchFields: string[]
  sort: Sort
}

export const archiveConfig: Record<ArchiveCollection, ArchiveConfig> = {
  episodes: {
    baseUrl: '/episodes',
    heading: 'Episodes',
    labels: { plural: 'Episodes', singular: 'Episode' },
    searchFields: [
      'title',
      'meta.description',
      'tracklist.artist',
      'tracklist.title',
      'show.title',
      'show.hosts.title',
    ],
    sort: ['-dateAired', '-id'],
  },
  posts: {
    baseUrl: '/posts',
    heading: 'Blog',
    labels: { plural: 'Posts', singular: 'Post' },
    searchFields: ['title', 'meta.description', 'categories.title'],
    sort: ['-publishedAt', '-id'],
  },
  shows: {
    baseUrl: '/shows',
    heading: 'Shows',
    labels: { plural: 'Shows', singular: 'Show' },
    searchFields: ['title', 'meta.description', 'hosts.title', 'genres.title'],
    sort: ['title', 'id'],
  },
}

export type ArchiveSearchParams = {
  page: number
  q: string
  show: string
}

export type RawSearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/** Normalise untrusted `?q=&show=&page=` values; anything invalid falls back to "no filter" / page 1. */
export const parseArchiveSearchParams = (params: RawSearchParams): ArchiveSearchParams => {
  const q = first(params.q).replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH).trim()

  const showRaw = first(params.show).trim().toLowerCase()
  const show = showRaw.length <= 200 && SLUG_PATTERN.test(showRaw) ? showRaw : ''

  const pageNum = Number(first(params.page))
  const page = Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 10000 ? pageNum : 1

  return { page, q, show }
}

/**
 * Every word must match at least one of `fields` (words AND, fields OR), so
 * "bowie lindy" finds a Bowie track on Lindy's show. Returns undefined for an
 * empty query.
 */
export const buildSearchWhere = (fields: string[], q: string): Where | undefined => {
  const words = q.split(' ').filter(Boolean).slice(0, MAX_QUERY_WORDS)
  if (words.length === 0) return undefined

  return {
    and: words.map((word) => ({
      or: fields.map((field) => ({ [field]: { like: word } })),
    })),
  }
}

/** Query string for links that keep the current filters (empty when unfiltered). */
export const archiveQueryString = ({ q, show }: Pick<ArchiveSearchParams, 'q' | 'show'>) => {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (show) params.set('show', show)
  return params.toString()
}
