import Link from 'next/link'
import React from 'react'

import type { Episode } from '@/payload-types'

import { GradientFill } from '@/components/GradientFill'
import { Media } from '@/components/Media'
import { formatDateTime } from '@/utilities/formatDateTime'

export const EpisodeHero: React.FC<{
  episode: Episode
}> = ({ episode }) => {
  const { title, image, show, dateAired } = episode
  const showTitle = typeof show === 'object' && show !== null ? show.title : undefined
  const showSlug = typeof show === 'object' && show !== null ? show.slug : undefined

  return (
    <div className="relative -mt-[10.4rem] flex items-end">
      <div className="container z-10 relative lg:grid lg:grid-cols-[1fr_48rem_1fr] text-white pb-8">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          <div className="uppercase text-sm mb-6">{formatDateTime(dateAired)}</div>

          <div className="">
            <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl">{title}</h1>
          </div>
          {showTitle && (
            <div className="flex flex-col md:flex-row gap-4 md:gap-16">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-lg">
                    Part of{' '}
                    {showSlug ? (
                      <Link className="underline" href={`/shows/${showSlug}`}>
                        {showTitle}
                      </Link>
                    ) : (
                      showTitle
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {image && typeof image !== 'string' ? (
        <div className="relative min-h-[66vh] select-none">
          <Media fill priority imgClassName="-z-10 object-cover" resource={image} />
          <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent" />
        </div>
      ) : (
        <div className="h-[40vh] select-none -z-10">
          <GradientFill id="episode-gradient-fill" />
          <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t dark:from-black to-transparent from-white to-transparent" />
        </div>
      )}
    </div>
  )
}
