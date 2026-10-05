import { notFound } from 'next/navigation'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Show } from '@/payload-types'
import { ScheduleItem } from '@/schedule/schedule-common';



import { ShowHero } from '@/heros/ShowHero'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { ShowScheduleBlock } from '@/schedule/ShowSchedule/Component'
import { CollectionArchive } from '@/components/CollectionArchive'
import { Pagination } from '@/components/Pagination'

export const EPISODES_PER_PAGE = 12

export async function ShowView({ slug, page = 1 }: { slug: string; page?: number }) {
  const { isEnabled: draft } = await draftMode()
  const url = '/shows/' + slug
  const show = await queryShowBySlug({ slug })

  if (!show) return <PayloadRedirects url={url} />

  const episodes = await queryEpisodesByShow({ showId: show.id, page })

  // Out-of-range page numbers (e.g. /page/99) 404 instead of rendering empty
  if (page > 1 && page > episodes.totalPages) notFound()

  return (
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <ShowHero show={show} />

      <div className="container pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <RichText data={show.content} enableGutter={false} />

          {show.stream_playlist && (
            <ShowScheduleBlock
              playlists={
                (Array.isArray(show.stream_playlist)
                  ? show.stream_playlist.filter(p => typeof p !== 'string')
                  : (typeof show.stream_playlist === 'string'
                      ? []
                      : [show.stream_playlist])) as Array<{
                        id: string;
                        name?: string;
                        schedule_items?: ScheduleItem[];
                        is_enabled?: boolean;
                      }>
              }
            />
          )}
        </div>
      </div>

      {episodes.docs.length > 0 && (
        <div className="pt-8">
          <div className="container">
            <h2 className="mb-8 text-2xl">Episodes</h2>
          </div>
          <CollectionArchive posts={episodes.docs} relationTo="episodes" />
          {episodes.totalPages > 1 && (
            <div className="container">
              <Pagination
                baseUrl={`/shows/${slug}`}
                page={episodes.page ?? page}
                totalPages={episodes.totalPages}
              />
            </div>
          )}
        </div>
      )}
    </article>
  )
}
export const queryShowBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'shows',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})

const queryEpisodesByShow = cache(async ({ showId, page }: { showId: string; page: number }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'episodes',
    depth: 1,
    limit: EPISODES_PER_PAGE,
    overrideAccess: false,
    page,
    sort: '-dateAired',
    where: {
      show: {
        equals: showId,
      },
      _status: {
        equals: 'published',
      },
    },
  })

  return result
})
