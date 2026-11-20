import { afterEach, describe, expect, it } from 'vitest'

import { deleteAll, getTestPayload } from './helpers/payload'

const custom = (label: string) =>
  ({ type: 'custom', url: `/${label.toLowerCase()}`, label, appearance: 'default' }) as const

const columnOf = (page: any) => page.layout[0].columns[0]

describe('Content block column links', () => {
  afterEach(async () => {
    await deleteAll(await getTestPayload(), 'pages')
  })

  it('stores multiple links per column', async () => {
    const payload = await getTestPayload()
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Links page',
        hero: { type: 'none' },
        layout: [{ blockType: 'content', columns: [{ links: [{ link: custom('A') }, { link: custom('B') }] }] }],
      },
    })

    expect(columnOf(page).links.map((l: any) => l.link.label)).toEqual(['A', 'B'])
  })

  it('reads a legacy single link as the first entry in links, populated, and saves it back once', async () => {
    const payload = await getTestPayload()
    const target = await payload.create({
      collection: 'pages',
      data: { title: 'Target', slug: 'target', hero: { type: 'none' }, layout: [{ blockType: 'content' }] },
    })

    // Simulate a pre-existing doc: legacy `enableLink` + `link`, no `links`.
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Legacy page',
        hero: { type: 'none' },
        layout: [
          {
            blockType: 'content',
            columns: [
              {
                enableLink: true,
                link: {
                  type: 'reference',
                  label: 'Legacy',
                  appearance: 'default',
                  reference: { relationTo: 'pages', value: target.id },
                },
              },
            ],
          },
        ],
      } as any,
    })

    const read = await payload.findByID({ collection: 'pages', id: page.id, depth: 1 })
    const col = columnOf(read)
    expect(col.enableLink).toBe(false)
    expect(col.links).toHaveLength(1)
    expect(col.links[0].link.reference.value.slug).toBe('target')

    // What the admin does: save the read doc (depth 0) plus a second link.
    const forEdit = await payload.findByID({ collection: 'pages', id: page.id, depth: 0 })
    const editCol = columnOf(forEdit)
    editCol.links.push({ link: custom('Added') })
    await payload.update({ collection: 'pages', id: page.id, data: { layout: forEdit.layout } })

    const after = columnOf(await payload.findByID({ collection: 'pages', id: page.id, depth: 0 }))
    expect(after.enableLink).toBe(false)
    expect(after.links.map((l: any) => l.link.label)).toEqual(['Legacy', 'Added'])
  })
})
