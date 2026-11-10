import { describe, expect, it } from 'vitest'

import { createAutoMeta, generateMetaDescription } from './autoMeta'

const rich = (text: string) =>
  ({
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text, version: 1 }], version: 1 }],
      direction: null, format: '', indent: 0, version: 1,
    },
  }) as any

const run = (data: any, originalDoc?: any) =>
  (createAutoMeta('description') as any)({ data, originalDoc, operation: originalDoc ? 'update' : 'create', req: {} })

describe('autoMeta', () => {
  it('fills empty SEO title/description from title/description', () => {
    const out = run({ title: 'Show A', description: rich('Hello world') })
    expect(out.meta.title).toBe('Show A')
    expect(out.meta.description).toBe('Hello world')
  })

  it('follows title changes while still auto', () => {
    const original = { title: 'Old', meta: { title: 'Old' } }
    expect(run({ title: 'New', meta: { title: 'Old' } }, original).meta.title).toBe('New')
  })

  it('keeps an edited value', () => {
    const original = { title: 'Old', meta: { title: 'Custom' } }
    expect(run({ title: 'New', meta: { title: 'Custom' } }, original).meta.title).toBe('Custom')
  })

  it('truncates long descriptions on a word boundary', () => {
    const out = generateMetaDescription({ description: rich('word '.repeat(100)) }, 'description')
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
  })

  it('mirrors thumbnail into meta.image, and leaves it alone when not sent', () => {
    expect(run({ title: 'T', thumbnail: 'm1' }).meta.image).toBe('m1')
    expect(run({ title: 'T', thumbnail: null }, { meta: { image: 'm1' } }).meta.image).toBeNull()
    expect(run({ title: 'T', meta: { image: 'm2' } }).meta.image).toBe('m2')
  })
})
