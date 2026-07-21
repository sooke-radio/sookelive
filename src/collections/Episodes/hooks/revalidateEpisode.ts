import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Episode } from '../../../payload-types'

const getShowSlug = async (
  show: Episode['show'],
  req: PayloadRequest,
): Promise<string | undefined> => {
  if (!show) return undefined
  if (typeof show === 'object') return show.slug ?? undefined

  const showDoc = await req.payload.findByID({
    collection: 'shows',
    id: show,
    depth: 0,
    req,
  })

  return showDoc?.slug ?? undefined
}

const revalidateEpisodePaths = async (doc: Episode, req: PayloadRequest) => {
  const path = `/episodes/${doc.slug}`

  req.payload.logger.info(`Revalidating episode at path: ${path}`)

  revalidatePath(path)
  revalidatePath('/episodes')
  revalidateTag('episodes', 'max')
  revalidateTag('episodes-sitemap', 'max')

  const showSlug = await getShowSlug(doc.show, req)
  if (showSlug) {
    revalidatePath(`/shows/${showSlug}`)
  }
}

export const revalidateEpisode: CollectionAfterChangeHook<Episode> = async ({ doc, req }) => {
  if (!req.context.disableRevalidate && doc._status === 'published') {
    await revalidateEpisodePaths(doc, req)
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Episode> = async ({ doc, req }) => {
  if (!req.context.disableRevalidate && doc) {
    await revalidateEpisodePaths(doc, req)
  }
  return doc
}
