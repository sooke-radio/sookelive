import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Show } from '@/payload-types'
import { ScheduleItem } from '@/schedule/schedule-common';



import { ShowHero } from '@/heros/ShowHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { ShowScheduleBlock } from '@/schedule/ShowSchedule/Component'
import { CollectionArchive } from '@/components/CollectionArchive'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const shows = await payload.find({
    collection: 'shows',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = shows.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Show({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const url = '/shows/' + slug
  const show = await queryShowBySlug({ slug })

  if (!show) return <PayloadRedirects url={url} />

  const episodes = await queryEpisodesByShow({ showId: show.id })

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

      {episodes.length > 0 && (
        <div className="pt-8">
          <div className="container">
            <h2 className="mb-8 text-2xl">Episodes</h2>
          </div>
          <CollectionArchive posts={episodes} relationTo="episodes" />
        </div>
      )}
    </article>
  )
}
export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const show = await queryShowBySlug({ slug })

  return generateMeta({ doc: show })
}

const queryShowBySlug = cache(async ({ slug }: { slug: string }) => {
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

const queryEpisodesByShow = cache(async ({ showId }: { showId: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'episodes',
    depth: 1,
    limit: 12,
    overrideAccess: false,
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

  return result.docs
})
