import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { GradientFill } from '@/components/GradientFill/index.client'

export const MediumImpactHero: React.FC<Page['hero']> = ({ links, background,  media, richText }) => {
  return (
    <div className="relative -mt-[10.4rem] flex items-end">
      <div className="container mt-[10.4rem] mb-8">
        {richText && <RichText className="mb-6" data={richText} enableGutter={false} />}

        {Array.isArray(links) && links.length > 0 && (
          <ul className="flex gap-4">
            {links.map(({ link }, i) => {
              return (
                <li key={i}>
                  <CMSLink {...link} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
        { background && background === 'media' && media && typeof media === 'object' ? (
          <div className="container ">
              <Media
                className="-mx-4 md:-mx-8 2xl:-mx-16"
                imgClassName=""
                priority
                resource={media}
              />
              {media?.caption && (
                <div className="mt-3">
                  <RichText data={media.caption} enableGutter={false} />
                </div>
              )}
          </div>
        ) : ( 
          <div className="h-[33vh] select-none -z-10">
            <GradientFill id="gradient-fill" />
            <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t dark:from-black to-transparent from-white to-transparent" />
          </div>
      ) } 
    </div>
  )
}
