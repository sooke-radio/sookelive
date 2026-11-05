import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { generateMeta } from '@/utilities/generateMeta'
import { EPISODES_PER_PAGE, ShowView, queryShowBySlug } from '../../ShowView'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const shows = await payload.find({
    collection: 'shows',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params: { slug: string; pageNumber: string }[] = []

  for (const show of shows.docs) {
    if (!show.slug) continue

    const { totalDocs } = await payload.count({
      collection: 'episodes',
      overrideAccess: false,
      where: {
        show: { equals: show.id },
        _status: { equals: 'published' },
      },
    })

    const totalPages = Math.ceil(totalDocs / EPISODES_PER_PAGE)
    for (let i = 1; i <= totalPages; i++) {
      params.push({ slug: show.slug, pageNumber: String(i) })
    }
  }

  return params
}

type Args = {
  params: Promise<{
    pageNumber: string
    slug?: string
  }>
}

export default async function ShowPage({ params: paramsPromise }: Args) {
  const { pageNumber, slug = '' } = await paramsPromise
  const page = Number(pageNumber)

  if (!Number.isInteger(page) || page < 1) notFound()

  return <ShowView page={page} slug={slug} />
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber, slug = '' } = await paramsPromise
  const show = await queryShowBySlug({ slug })
  const meta = await generateMeta({ doc: show })

  return { ...meta, title: `${meta.title ?? 'Show'} - Page ${pageNumber}` }
}
