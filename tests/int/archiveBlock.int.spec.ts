import { afterEach, describe, expect, it, vi } from 'vitest'
import type React from 'react'

// RichText transitively imports @payloadcms/ui (and its .scss), which Node can't load.
vi.mock('@/components/RichText', () => ({ default: () => null }))

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CollectionArchive } from '@/components/CollectionArchive'
import { CMSLink } from '@/components/Link'
import { deleteAll, getTestPayload } from './helpers/payload'
import { minimalContent } from './helpers/fixtures'

const adminUser = { collection: 'users', id: 'fake-admin-id', roles: ['admin'] } as any

const DAY =24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString()

// ArchiveBlock is an async server component - call it directly and pull the
// props it hands to its children out of the returned element tree.
const render = async (props: Parameters<typeof ArchiveBlock>[0]) => {
  const tree = (await ArchiveBlock(props)) as React.ReactElement<{ children: React.ReactNode[] }>
  const children = (tree.props.children as React.ReactElement[]).filter(Boolean)
  const archive = children.find((c) => c.type === CollectionArchive) as React.ReactElement<{
    posts: { title: string }[]
  }>
  const linkWrapper = children.find(
    (c) => (c.props as { children?: React.ReactElement }).children?.type === CMSLink,
  ) as React.ReactElement<{ children: React.ReactElement<{ url?: string; label?: string }> }>
  return {
    titles: archive.props.posts.map((p) => p.title),
    link: linkWrapper?.props.children.props,
  }
}

describe('ArchiveBlock', () => {
  afterEach(async () => {
    const payload = await getTestPayload()
    await deleteAll(payload, 'episodes')
    await deleteAll(payload, 'shows')
    await deleteAll(payload, 'posts')
  })

  it('lists published, already-aired episodes newest dateAired first, up to the limit', async () => {
    const payload = await getTestPayload()
    const show = await payload.create({
      collection: 'shows',
      data: { title: 'Show', content: minimalContent, _status: 'published' },
    })

    const episodes: [string, number, 'published' | 'draft'][] = [
      ['Oldest', -10, 'published'],
      ['Middle', -5, 'published'],
      ['Newest', -1, 'published'],
      ['Second', -2, 'published'],
      ['Future', 3, 'published'],
      ['Draft', -0.5, 'draft'],
    ]
    for (const [title, offset, status] of episodes) {
      await payload.create({
        collection: 'episodes',
        draft: status === 'draft',
        user: adminUser,
        data: { title, show: show.id, dateAired: daysFromNow(offset), _status: status },
      })
    }

    const { titles, link } = await render({
      blockType: 'archive',
      populateBy: 'collection',
      relationTo: 'episodes',
      limit: 3,
    })

    expect(titles).toEqual(['Newest', 'Second', 'Middle'])
    expect(link).toBeUndefined()
  })

  it('lists posts newest publishedAt first and renders the "more" link when enabled', async () => {
    const payload = await getTestPayload()
    for (const [title, offset] of [
      ['Old post', -10],
      ['New post', -1],
      ['Mid post', -5],
    ] as const) {
      await payload.create({
        collection: 'posts',
        data: { title, content: minimalContent, publishedAt: daysFromNow(offset), _status: 'published' },
      })
    }

    const { titles, link } = await render({
      blockType: 'archive',
      populateBy: 'collection',
      relationTo: 'posts',
      limit: 2,
      enableLink: true,
      link: { type: 'custom', url: '/posts', label: 'More news' },
    })

    expect(titles).toEqual(['New post', 'Mid post'])
    expect(link).toMatchObject({ url: '/posts', label: 'More news' })
  })
})
