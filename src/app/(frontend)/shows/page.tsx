import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const shows = await payload.find({
    collection: 'shows',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Shows</h1>
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection="shows"
          currentPage={shows.page}
          limit={12}
          totalDocs={shows.totalDocs}
        />
      </div>

      <CollectionArchive posts={shows.docs} />

      <div className="container">
        {shows.totalPages > 1 && shows.page && (
          <Pagination page={shows.page} totalPages={shows.totalPages} />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Shows`,
  }
}
