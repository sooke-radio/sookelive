import type { Metadata } from 'next/types'
import React from 'react'

import { ArchivePage } from '@/components/ArchivePage'
import { parseArchiveSearchParams, type RawSearchParams } from '@/utilities/archive'
import PageClient from './page.client'

type Args = { searchParams: Promise<RawSearchParams> }

// Reads ?q=&page=, so this route renders per request.
export default async function Page({ searchParams }: Args) {
  const { page, q } = parseArchiveSearchParams(await searchParams)

  return (
    <>
      <PageClient />
      <ArchivePage collection="shows" page={page} q={q} />
    </>
  )
}

export async function generateMetadata({ searchParams }: Args): Promise<Metadata> {
  const { q } = parseArchiveSearchParams(await searchParams)
  return {
    title: `Shows`,
    // Don't index every search combination.
    ...(q ? { robots: { index: false, follow: true } } : {}),
  }
}
