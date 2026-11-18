import { afterEach, describe, expect, it } from 'vitest'

import { deleteAll, getTestPayload } from './helpers/payload'

const legacy = { type: 'custom', url: '/legacy', label: 'Legacy', appearance: 'default' } as const
const added = { type: 'custom', url: '/added', label: 'Added', appearance: 'outline' } as const

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
        layout: [{ blockType: 'content', columns: [{ links: [{ link: legacy }, { link: added }] }] }],
      },
    })

    const col = (page.layout[0] as any).columns[0]
    expect(col.links.map((l: any) => l.link.label)).toEqual(['Legacy', 'Added'])
  })

  it('moves a legacy single link into links on save', async () => {
    const payload = await getTestPayload()
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Legacy page',
        hero: { type: 'none' },
        layout: [
          {
            blockType: 'content',
            columns: [{ enableLink: true, link: legacy, links: [{ link: added }] }],
          },
        ],
      } as any,
    })

    const col = (page.layout[0] as any).columns[0]
    expect(col.enableLink).toBe(false)
    expect(col.links.map((l: any) => l.link.url)).toEqual(['/legacy', '/added'])
  })
})
