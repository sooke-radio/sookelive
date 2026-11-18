import configPromise from '@payload-config'
import { getPayload, type Where } from 'payload'

import {
  ARCHIVE_PER_PAGE,
  archiveConfig,
  buildSearchWhere,
  type ArchiveCollection,
} from '@/utilities/archive'
import { airedEpisodesWhere } from '@/utilities/airedEpisodes'

// Conditions every public listing of `collection` applies, before any search/filter.
const baseConditions = (collection: ArchiveCollection): Where[] =>
  collection === 'episodes' ? [airedEpisodesWhere()] : []

const toWhere = (conditions: Where[]): Where | undefined =>
  conditions.length > 0 ? { and: conditions } : undefined

export const queryArchive = async ({
  collection,
  page,
  q = '',
  showId,
}: {
  collection: ArchiveCollection
  page: number
  q?: string
  showId?: string
}) => {
  const payload = await getPayload({ config: configPromise })
  const { searchFields, sort } = archiveConfig[collection]

  const conditions = baseConditions(collection)
  if (collection === 'episodes' && showId) conditions.push({ show: { equals: showId } })
  const search = buildSearchWhere(searchFields, q)
  if (search) conditions.push(search)

  return payload.find({
    collection,
    depth: 1,
    limit: ARCHIVE_PER_PAGE,
    // Public listing: respect read access so drafts never appear.
    overrideAccess: false,
    page,
    sort,
    where: toWhere(conditions),
  })
}

/** Page numbers for the unfiltered `/<collection>/page/N` static routes. */
export const archivePageNumbers = async (collection: ArchiveCollection) => {
  const payload = await getPayload({ config: configPromise })
  const { totalDocs } = await payload.count({
    collection,
    overrideAccess: false,
    where: toWhere(baseConditions(collection)),
  })

  const totalPages = Math.ceil(totalDocs / ARCHIVE_PER_PAGE)
  return Array.from({ length: totalPages }, (_, i) => ({ pageNumber: String(i + 1) }))
}

/** Published shows for the episodes "filter by show" dropdown. */
export const queryShowOptions = async () => {
  const payload = await getPayload({ config: configPromise })
  const { docs } = await payload.find({
    collection: 'shows',
    depth: 0,
    overrideAccess: false,
    pagination: false,
    select: { slug: true, title: true },
    sort: 'title',
  })

  return docs.flatMap((show) => (show.slug ? [{ id: show.id, slug: show.slug, title: show.title }] : []))
}
