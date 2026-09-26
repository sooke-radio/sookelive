import React from 'react'

import { MixcloudEmbed } from '@/components/MixcloudEmbed'
import type { Episode } from '@/payload-types'

type Embed = NonNullable<Episode['embeds']>[number]

const YouTubeEmbed: React.FC<{ src: string; title?: string | null }> = ({ src, title }) => (
  <div className="aspect-video w-full overflow-hidden rounded">
    <iframe
      allow="encrypted-media; fullscreen; picture-in-picture; web-share"
      allowFullScreen
      className="h-full w-full"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={src}
      title={title || 'YouTube video'}
    />
  </div>
)

const SoundCloudEmbed: React.FC<{ src: string; title?: string | null }> = ({ src, title }) => (
  <iframe
    allow="autoplay"
    className="w-full"
    height="166"
    loading="lazy"
    src={src}
    title={title || 'SoundCloud player'}
  />
)

const renderEmbed = (embed: Embed): React.ReactNode => {
  switch (embed.type) {
    case 'youtube':
      return embed.url ? <YouTubeEmbed src={embed.url} title={embed.title} /> : null
    case 'soundcloud':
      return embed.url ? <SoundCloudEmbed src={embed.url} title={embed.title} /> : null
    case 'mixcloud':
      return embed.url ? <MixcloudEmbed src={embed.url} /> : null
    default:
      return null
  }
}

/**
 * Renders a page's third-party media embeds (YouTube, SoundCloud, Mixcloud) in order.
 */
export const MediaEmbeds: React.FC<{ embeds?: Embed[] | null }> = ({ embeds }) => {
  if (!embeds || embeds.length === 0) return null

  return (
    <div className="container max-w-[48rem] mx-auto flex flex-col gap-6 pt-8">
      {embeds.map((embed, index) => {
        const key = embed.id ?? String(index)
        const content = renderEmbed(embed)
        if (!content) return null

        return (
          <div key={key}>
            {embed.title && <h2 className="mb-2 text-xl">{embed.title}</h2>}
            {content}
          </div>
        )
      })}
    </div>
  )
}
