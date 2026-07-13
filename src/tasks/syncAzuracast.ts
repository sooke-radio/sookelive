import type { TaskHandler } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'
import { syncPlaylists } from '@/collections/Playlists/syncPlaylists'

export const syncAzuracastTask = {
  slug: 'sync-azuracast',
  name: 'Sync Azuracast Playlists',
  title: 'Sync Azuracast Playlists',
  description: 'Synchronizes playlists from Azuracast and revalidates related content',

  async handler({ input, job, req }) {
    console.log('Running Azuracast playlist sync...')

    try {
      const results = await syncPlaylists(req.payload)
      console.log('Playlist sync completed successfully:', results)

      // Revalidate all necessary paths and tags
      revalidatePath('/schedule')
      revalidateTag('shows')
      revalidateTag('playlists')

      return {
        output: {
          message: 'Playlist sync completed successfully',
          results
        }
      }
    } catch (error) {
      console.error('Error during playlist sync:', error)
      throw error
    }
  }
}
