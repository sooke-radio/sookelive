'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Episode, Post, Show } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatDateTime } from '@/utilities/formatDateTime'
import { GradientFill } from '@/components/GradientFill/index.client'

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title'> & {
  // Episodes only: used when no SEO (meta) image is set
  image?: Episode['image']
  dateAired?: Episode['dateAired']
  // Episodes only: shown in place of the SEO description (needs depth >= 1 to be populated)
  show?: Episode['show']
  // Shows only: shown in place of the SEO description (need depth >= 1 to be populated)
  hosts?: Show['hosts']
  genres?: Show['genres']
}

// Titles of populated relationship docs; unpopulated (id-only) entries are skipped.
const relationTitles = (docs?: (string | { title?: string | null })[] | null): string[] =>
  (docs ?? []).flatMap((doc) => (typeof doc === 'object' && doc.title ? [doc.title] : []))

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'episodes' | 'posts' | 'shows'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title, image: episodeImage, dateAired, show, hosts, genres } =
    doc || {}
  const { description, image: seoImage } = meta || {}
  const isEpisode = relationTo === 'episodes'
  const isShow = relationTo === 'shows'
  const hostNames = isShow ? relationTitles(hosts) : []
  const genreNames = isShow ? relationTitles(genres) : []
  const metaImage = seoImage || (isEpisode ? episodeImage : undefined)
  const showTitle = isEpisode && show && typeof show === 'object' ? show.title : undefined

  const hasCategories = (categories && Array.isArray(categories) && categories.length > 0)
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = `/${relationTo}/${slug}`

  return (
    <article
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer relative min-h-[250px]',
        className,
      )}
      // card.ref is a RefObject forwarded from useClickableCard, not read here
      // eslint-disable-next-line react-hooks/refs
      ref={card.ref}
    >
      
      <div className="relative">
      {!metaImage && 
        <div className="aspect-[4/3] w-auto">
          <GradientFill id="" />
          {/* <img
            alt="The Sooke Radio Society Logo showing the word Sooke superimposed over a line drawing of a boombox with the words Radio Society beneath."
            className="max-w-[220px] z-10"
            src="/srs-logo-sq.png"
            decoding = "async"
          /> */}
        </div>
        }
        {metaImage && typeof metaImage !== 'string' && (
          <div
            className={cn(
              'relative w-full overflow-hidden',
              !(metaImage.width && metaImage.height) && 'aspect-square',
            )}
            style={
              metaImage.width && metaImage.height
                ? { aspectRatio: `${metaImage.width} / ${Math.min(metaImage.width, metaImage.height)}` }
                : undefined
            }
          >
            <Media fill imgClassName="object-cover object-center" resource={metaImage} size="33vw" />
          </div>
        )}
      </div>
      <div className="p-4 z-10">
        {showCategories && hasCategories && (
          <div className="uppercase text-sm mb-4">
            {showCategories && hasCategories && (
              <div>
                {categories?.map((category, index) => {
                  if (typeof category === 'object') {
                    const { title: titleFromCategory } = category

                    const categoryTitle = titleFromCategory || 'Untitled category'

                    const isLast = index === categories.length - 1

                    return (
                      <Fragment key={index}>
                        {categoryTitle}
                        {!isLast && <Fragment>, &nbsp;</Fragment>}
                      </Fragment>
                    )
                  }

                  return null
                })}
              </div>
            )}
          </div>
        )}
        {titleToUse && (
          <div className="prose">
            <h3>
              <Link
                className="not-prose"
                href={href}
                // link.ref is a RefObject forwarded from useClickableCard, not read here
                // eslint-disable-next-line react-hooks/refs
                ref={link.ref}
              >
                {titleToUse}
              </Link>
            </h3>
          </div>
        )}
        {isEpisode && dateAired && (
          <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(dateAired)}</div>
        )}
        {isEpisode && showTitle && <p className="mt-2">{showTitle}</p>}
        {isShow && (
          <>
            {hostNames.length > 0 && <p className="mt-2">{hostNames.join(', ')}</p>}
            {genreNames.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Genres">
                {genreNames.map((genre) => (
                  <li
                    key={genre}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {genre}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {!isEpisode && !isShow && description && (
          <div className="mt-2">
            <p>{sanitizedDescription}</p>
          </div>
        )}

      </div>
    </article>
  )
}
