import { describe, expect, it } from 'vitest'
import { formatAuthors } from './formatAuthors'

describe('formatAuthors', () => {
  it('returns an empty string for no authors', () => {
    expect(formatAuthors([])).toBe('')
  })

  it('returns the single author name for one author', () => {
    expect(formatAuthors([{ name: 'Alice' }])).toBe('Alice')
  })

  it('joins two authors with "and"', () => {
    expect(formatAuthors([{ name: 'Alice' }, { name: 'Bob' }])).toBe('Alice and Bob')
  })

  it('joins three or more authors with commas and a trailing "and"', () => {
    expect(formatAuthors([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }])).toBe(
      'Alice, Bob, and Carol',
    )
  })

  it('filters out authors without a name', () => {
    expect(formatAuthors([{ name: 'Alice' }, { name: '' }, { name: 'Bob' }])).toBe('Alice and Bob')
  })

  it('uses the correct trailing author when a name was filtered out earlier in the list', () => {
    // Regression test: the >2-author branch used to index the trailing
    // author off the original (unfiltered) array instead of the filtered
    // one, so a filtered-out author anywhere before the end shifted which
    // name was quoted as the last one.
    expect(
      formatAuthors([{ name: 'Alice' }, { name: '' }, { name: 'Bob' }, { name: 'Carol' }]),
    ).toBe('Alice, Bob, and Carol')
  })
})
