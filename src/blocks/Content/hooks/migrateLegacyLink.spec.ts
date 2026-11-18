import { describe, expect, it } from 'vitest'

import { migrateLegacyColumnLinks } from './migrateLegacyLink'

const legacy = { type: 'custom', url: '/about', label: 'About' }
const other = { type: 'custom', url: '/shows', label: 'Shows' }

describe('migrateLegacyColumnLinks', () => {
  it('moves an enabled legacy link to the front of links and disables it', () => {
    const [col] = migrateLegacyColumnLinks([
      { size: 'half', enableLink: true, link: legacy, links: [{ link: other }] },
    ])!
    expect(col!.enableLink).toBe(false)
    expect(col!.links).toEqual([{ link: legacy }, { link: other }])
    expect(col!.size).toBe('half')
  })

  it('handles a legacy link with no existing links array', () => {
    const [col] = migrateLegacyColumnLinks([{ enableLink: true, link: legacy }])!
    expect(col!.links).toEqual([{ link: legacy }])
  })

  it('leaves columns without an enabled legacy link untouched', () => {
    const cols = [{ enableLink: false, link: legacy }, { links: [{ link: other }] }]
    expect(migrateLegacyColumnLinks(cols)).toEqual(cols)
  })

  it('passes through non-array values', () => {
    expect(migrateLegacyColumnLinks(undefined)).toBeUndefined()
    expect(migrateLegacyColumnLinks(null)).toBeNull()
  })
})
