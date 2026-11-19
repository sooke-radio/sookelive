import { describe, expect, it } from 'vitest'

import { migrateLegacyColumnLinks } from './migrateLegacyLink'

const legacy = { type: 'reference', label: 'About', reference: { relationTo: 'pages', value: 'abc' } }
const other = { type: 'custom', url: '/shows', label: 'Shows' }

const migrate = (cols: unknown) => migrateLegacyColumnLinks(cols) as any[]

describe('migrateLegacyColumnLinks', () => {
  it('moves an enabled legacy link to the front of links and disables it', () => {
    const [col] = migrate([
      { id: 'c1', size: 'half', enableLink: true, link: legacy, links: [{ id: 'r1', link: other }] },
    ])
    expect(col.enableLink).toBe(false)
    expect(col.links).toEqual([
      { id: 'c1-legacy-link', link: legacy },
      { id: 'r1', link: other },
    ])
    expect(col.size).toBe('half')
  })

  it('copies the link so relationship population cannot touch the legacy object twice', () => {
    const [col] = migrate([{ id: 'c1', enableLink: true, link: legacy }])
    expect(col.links[0].link).not.toBe(legacy)
    expect(col.links[0].link.reference).not.toBe(legacy.reference)
  })

  it('treats a missing or non-array links value as empty', () => {
    expect(migrate([{ enableLink: true, link: legacy }])[0].links).toHaveLength(1)
    expect(migrate([{ enableLink: true, link: legacy, links: 2 }])[0].links).toHaveLength(1)
  })

  it('leaves columns without an enabled legacy link untouched', () => {
    const cols = [{ enableLink: false, link: legacy }, { links: [{ link: other }] }]
    expect(migrate(cols)).toEqual(cols)
  })

  it('passes through non-array values', () => {
    expect(migrateLegacyColumnLinks(undefined)).toBeUndefined()
    expect(migrateLegacyColumnLinks(3)).toBe(3)
  })
})
