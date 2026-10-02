import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { GradientFill } from '@/components/GradientFill'

export const dynamic = 'force-static'
export const revalidate = 600

export default async function Page() {
  const payload = await getPayload({ config: configPromise })

  const episodes = await payload.find({
    collection: 'episodes',
    depth: 1,
    limit: 12,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      meta: true,
    },
  })

  return (
    <div className="pt-24 pb-24 relative">
      <div className="h-[33vh] w-full select-none absolute top-0 left-0 -z-10">
        <GradientFill id="gradient-fill" />
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-gradient-to-t dark:from-black to-transparent from-white to-transparent" />
      </div>
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Episodes</h1>
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection="episodes"
          currentPage={episodes.page}
          limit={12}
          totalDocs={episodes.totalDocs}
        />
      </div>

      <CollectionArchive posts={episodes.docs} relationTo="episodes" />

      <div className="container">
        {episodes.totalPages > 1 && episodes.page && (
          <Pagination page={episodes.page} totalPages={episodes.totalPages} baseUrl="/episodes" />
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: `Sooke.live Community Radio Episodes`,
  }
}
