import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Playlist } from '../../../payload-types'

export const revalidatePlaylist: CollectionAfterChangeHook<Playlist> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    revalidatePlaylistPages(payload)
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Playlist> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    revalidatePlaylistPages(payload)
  }

  return doc
}

async function revalidatePlaylistPages(payload: Payload) {
  revalidatePath('/schedule')
  revalidateTag('shows')
  revalidateTag('playlists')
  payload.logger.info(`Revalidating playlists and schedule components`)

  // Find all pages that contain Schedule blocks
  const pagesWithSchedule = await payload.find({
    collection: 'pages',
    where: {
      'layout.blockType': {
        equals: 'schedule',
      },
    },
    limit: 1000,
  })

  // Revalidate each page that contains a schedule block
  pagesWithSchedule.docs.forEach((page) => {
    if (page.slug) {
      revalidatePath(`/${page.slug}`)
      payload.logger.info(`Revalidated page: /${page.slug}`)
    }
  })
}
