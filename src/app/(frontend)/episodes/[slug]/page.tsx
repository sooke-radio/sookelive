import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import { EpisodeHero } from '@/heros/EpisodeHero'
import { generateMeta } from '@/utilities/generateMeta'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { EpisodePlayer } from '@/components/EpisodePlayer/index.client'
import { MediaEmbeds } from '@/components/MediaEmbeds'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const episodes = await payload.find({
    collection: 'episodes',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = episodes.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Episode({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const url = '/episodes/' + slug
  const episode = await queryEpisodeBySlug({ slug })

  if (!episode) return <PayloadRedirects url={url} />

  const audioUrl =
    episode.audio && typeof episode.audio === 'object' ? episode.audio.url : undefined
  const hasMedia = Boolean(audioUrl) || Boolean(episode.embeds?.some((embed) => embed.url))

  return (
    <article className="pt-16 pb-16">
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <EpisodeHero episode={episode} />

      {episode.description && (
        <div className="flex flex-col items-center gap-4 pt-8">
          <div className="container">
            <RichText
              className="max-w-[48rem] mx-auto"
              data={episode.description}
              enableGutter={false}
            />
          </div>
        </div>
      )}

      {hasMedia && (
        <div className="container max-w-[48rem] mx-auto pt-8">
          <h2 className="text-2xl">Episode Media</h2>
          {audioUrl && (
            <div className="pt-4">
              <EpisodePlayer episodeId={String(episode.id)} src={audioUrl} />
            </div>
          )}
          <MediaEmbeds embeds={episode.embeds} />
        </div>
      )}

      {episode.tracklist && episode.tracklist.length > 0 && (
        <div className="container max-w-[48rem] mx-auto pt-8">
          <h2 className="mb-4 text-2xl">Tracklist</h2>
          <table className="w-full text-left">
            <tbody>
              {episode.tracklist.map((track, index) => (
                <tr className="border-b border-border" key={index}>
                  <td className="py-2 pr-4 whitespace-nowrap">{track.startTime}</td>
                  <td className="py-2 pr-4">{track.artist}</td>
                  <td className="py-2">{track.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}
export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const episode = await queryEpisodeBySlug({ slug })

  return generateMeta({ doc: episode })
}

const queryEpisodeBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'episodes',
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
