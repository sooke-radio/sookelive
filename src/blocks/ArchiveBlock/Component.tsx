import type { Episode, Post, Show, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'
import type { Where } from 'payload'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'
import { CMSLink } from '@/components/Link'
import { airedEpisodesWhere } from '@/utilities/airedEpisodes'
import { archiveConfig } from '@/utilities/archive'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const {
    id,
    categories,
    enableLink,
    introContent,
    limit: limitFromProps,
    link,
    populateBy,
    relationTo,
    selectedDocs,
  } = props

  const limit = limitFromProps || 3
  const collection = relationTo || 'posts'

  let posts: (Episode | Post | Show)[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const flattenedCategories = categories?.map((category) => {
      if (typeof category === 'object') return category.id
      else return category
    })

    const conditions: Where[] = []

    // Only Posts have a `categories` field - Shows/Episodes have no such field to filter on.
    if (collection === 'posts' && flattenedCategories && flattenedCategories.length > 0) {
      conditions.push({ categories: { in: flattenedCategories } })
    }

    if (collection === 'episodes') {
      conditions.push(airedEpisodesWhere())
    }

    const fetchedPosts = await payload.find({
      collection,
      depth: 1,
      limit,
      // Respect read access so drafts never appear on public pages.
      overrideAccess: false,
      // Same order as the /posts, /shows and /episodes archives.
      sort: archiveConfig[collection].sort,
      ...(conditions.length > 0 ? { where: { and: conditions } } : {}),
    })

    posts = fetchedPosts.docs
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as (Episode | Post | Show)[]

      posts = filteredSelectedPosts
    }
  }

  return (
    <div className="my-16" id={`block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ml-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive posts={posts} relationTo={collection} />
      {enableLink && link && (
        <div className="container mt-8 flex justify-center">
          <CMSLink {...link} className="min-w-32" />
        </div>
      )}
    </div>
  )
}
