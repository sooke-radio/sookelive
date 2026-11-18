import { describe, expect, it } from 'vitest'

import {
  MAX_QUERY_LENGTH,
  MAX_QUERY_WORDS,
  archiveQueryString,
  buildSearchWhere,
  parseArchiveSearchParams,
} from './archive'

describe('parseArchiveSearchParams', () => {
  it('returns defaults for empty params', () => {
    expect(parseArchiveSearchParams({})).toEqual({ page: 1, q: '', show: '' })
  })

  it('trims and collapses whitespace in q, and caps its length', () => {
    expect(parseArchiveSearchParams({ q: '  bowie \n  heroes ' }).q).toBe('bowie heroes')
    expect(parseArchiveSearchParams({ q: 'x'.repeat(500) }).q).toHaveLength(MAX_QUERY_LENGTH)
  })

  it('takes the first value of repeated params', () => {
    expect(parseArchiveSearchParams({ q: ['one', 'two'], show: ['a-show', 'b'] })).toMatchObject({
      q: 'one',
      show: 'a-show',
    })
  })

  it('accepts slug-shaped show values only', () => {
    expect(parseArchiveSearchParams({ show: 'Lindys-Flight-Plan' }).show).toBe('lindys-flight-plan')
    expect(parseArchiveSearchParams({ show: '{"$ne":1}' }).show).toBe('')
    expect(parseArchiveSearchParams({ show: '../etc' }).show).toBe('')
  })

  it('falls back to page 1 for invalid page numbers', () => {
    expect(parseArchiveSearchParams({ page: '3' }).page).toBe(3)
    for (const page of ['0', '-2', '1.5', 'abc', '99999999']) {
      expect(parseArchiveSearchParams({ page }).page).toBe(1)
    }
  })
})

describe('buildSearchWhere', () => {
  it('returns undefined for an empty query', () => {
    expect(buildSearchWhere(['title'], '')).toBeUndefined()
  })

  it('ANDs words and ORs fields', () => {
    expect(buildSearchWhere(['title', 'show.title'], 'bowie lindy')).toEqual({
      and: [
        { or: [{ title: { like: 'bowie' } }, { 'show.title': { like: 'bowie' } }] },
        { or: [{ title: { like: 'lindy' } }, { 'show.title': { like: 'lindy' } }] },
      ],
    })
  })

  it('caps the number of words', () => {
    const where = buildSearchWhere(['title'], 'a b c d e f g h') as { and: unknown[] }
    expect(where.and).toHaveLength(MAX_QUERY_WORDS)
  })
})

describe('archiveQueryString', () => {
  it('includes only non-empty filters', () => {
    expect(archiveQueryString({ q: '', show: '' })).toBe('')
    expect(archiveQueryString({ q: 'jazz & blues', show: 'a-show' })).toBe('q=jazz+%26+blues&show=a-show')
  })
})
