import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Playlist } from '../../../payload-types'

export const revalidatePlaylist: CollectionAfterChangeHook<Playlist> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating playlists`)

    // Revalidate the schedule page and any pages that might display the schedule
    revalidatePath('/schedule')
    
    // Revalidate all show pages since they might display playlists
    revalidateTag('shows')
    
    // Create a specific tag for playlists
    revalidateTag('playlists')
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Playlist> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidatePath('/schedule')
    revalidateTag('shows')
    revalidateTag('playlists')
  }

  return doc
}
