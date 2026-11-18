import type { Metadata } from 'next/types'
import { notFound } from 'next/navigation'
import React from 'react'

import { ArchivePage } from '@/components/ArchivePage'
import { archivePageNumbers } from '@/components/ArchivePage/query'
import PageClient from './page.client'

export const revalidate = 600

type Args = {
  params: Promise<{
    pageNumber: string
  }>
}

// Unfiltered pages only; searches paginate via ?page=N on /shows.
export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber } = await paramsPromise
  const page = Number(pageNumber)

  if (!Number.isInteger(page) || page < 1) notFound()

  return (
    <>
      <PageClient />
      <ArchivePage collection="shows" page={page} />
    </>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  return {
    title: `Sooke.live Shows | Page ${pageNumber || ''}`,
  }
}

export async function generateStaticParams() {
  return archivePageNumbers('shows')
}
