import { formatDateTime } from 'src/utilities/formatDateTime'
import React from 'react'

import type { Show } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'
import { GradientFill } from '@/components/GradientFill'

export const ShowHero: React.FC<{
  show: Show
}> = ({ show }) => {
  const { genres, heroImage, background, title, hosts } = show
  const hostNames = hosts?.map(host => typeof host === 'object' && host.title ? host.title : '').filter(Boolean).join(', ')

  return (
    <div className="relative -mt-[10.4rem] flex items-end">
      <div className="container z-10 relative lg:grid lg:grid-cols-[1fr_48rem_1fr] text-white pb-8">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          <div className="uppercase text-sm mb-6">
            {genres?.map((category, index) => {
              if (typeof category === 'object' && category !== null) {
                const { title: categoryTitle } = category

                const titleToUse = categoryTitle || 'Untitled category'

                const isLast = index === genres.length - 1

                return (
                  <React.Fragment key={index}>
                    {titleToUse}
                    {!isLast && <React.Fragment>, &nbsp;</React.Fragment>}
                  </React.Fragment>
                )
              }
              return null
            })}
          </div>

          <div className="">
            <h1 className="mb-6 text-3xl md:text-5xl lg:text-6xl">{title}</h1>
          </div>
          {hostNames && (
            <div className="flex flex-col md:flex-row gap-4 md:gap-16">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-lg">With {hostNames}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
        {(background === 'media') ?
          (heroImage && typeof heroImage !== 'string') && (
            <div className="min-h-[66vh] select-none">
              <Media fill priority imgClassName="-z-10 object-cover" resource={heroImage} />
            </div>
          ) :
          <div className="h-[40vh] select-none -z-10">
            <GradientFill id="gradient-fill" />
            <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t dark:from-black to-transparent from-white to-transparent" />
          </div>
        }
          
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent" />
      </div>
  )
}
