import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { generateMeta } from '@/utilities/generateMeta'
import { ShowView, queryShowBySlug } from './ShowView'

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

  const params = shows.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Show({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  return <ShowView slug={slug} />
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const show = await queryShowBySlug({ slug })

  return generateMeta({ doc: show })
}
