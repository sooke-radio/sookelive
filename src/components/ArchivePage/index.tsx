import React from 'react'

import { ArchiveSearch } from '@/components/ArchiveSearch'
import { CollectionArchive } from '@/components/CollectionArchive'
import { GradientFill } from '@/components/GradientFill'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import {
  ARCHIVE_PER_PAGE,
  archiveConfig,
  archiveQueryString,
  type ArchiveCollection,
} from '@/utilities/archive'
import { queryArchive, queryShowOptions } from './query'

type Props = {
  collection: ArchiveCollection
  page: number
  q?: string
  /** Show slug (episodes only); unknown slugs are ignored. */
  show?: string
}

/**
 * Shared listing for /posts, /shows and /episodes (and their /page/N routes):
 * heading, search form, result count, cards and pagination.
 */
export const ArchivePage = async ({ collection, page, q = '', show = '' }: Props) => {
  const { baseUrl, heading, labels } = archiveConfig[collection]

  const showOptions = collection === 'episodes' ? await queryShowOptions() : undefined
  const selectedShow = show ? showOptions?.find((option) => option.slug === show) : undefined
  const showSlug = selectedShow?.slug ?? ''

  const results = await queryArchive({ collection, page, q, showId: selectedShow?.id })

  // Filtered results paginate via ?page=N on the index route; unfiltered via /page/N.
  const query = archiveQueryString({ q, show: showSlug })

  return (
    <div className="pt-24 pb-24 relative">
      <div className="h-[33vh] w-full select-none absolute top-0 left-0 -z-10">
        <GradientFill id="gradient-fill" />
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t dark:from-black to-transparent from-white to-transparent" />
      </div>

      <div className="container mb-8">
        <div className="prose dark:prose-invert max-w-none">
          <h1>{heading}</h1>
          {selectedShow && <p className="lead">From {selectedShow.title}</p>}
        </div>
      </div>

      <div className="container mb-8">
        <ArchiveSearch
          baseUrl={baseUrl}
          label={labels.plural.toLowerCase()}
          q={q}
          show={showSlug}
          showOptions={showOptions}
        />
      </div>

      <div className="container mb-8">
        <PageRange
          collectionLabels={labels}
          currentPage={results.page}
          limit={ARCHIVE_PER_PAGE}
          totalDocs={results.totalDocs}
        />
      </div>

      <CollectionArchive posts={results.docs} relationTo={collection} />

      <div className="container">
        {results.totalPages > 1 && results.page && (
          <Pagination
            page={results.page}
            totalPages={results.totalPages}
            baseUrl={baseUrl}
            query={query}
          />
        )}
      </div>
    </div>
  )
}
