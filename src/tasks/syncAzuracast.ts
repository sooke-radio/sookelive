import type { TaskHandler } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

export const syncAzuracastTask = {
  slug: 'sync-azuracast',
  name: 'Sync Azuracast Playlists',
  title: 'Sync Azuracast Playlists',
  description: 'Synchronizes playlists from Azuracast and revalidates related content',
  
  async handler({ input, job, req }) {
    console.log('Running Azuracast playlist sync...')
    
    try {
      // Call the existing playlists/sync endpoint
      const response = await fetch(process.env.NEXT_PUBLIC_SERVER_URL + '/api/playlists/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Sync failed with status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Playlist sync completed successfully:', result)
      
      // Revalidate all necessary paths and tags
      revalidatePath('/schedule')
      revalidateTag('shows')
      revalidateTag('playlists')
      
      return {
        output: {
          message: 'Playlist sync completed successfully',
          result
        }
      }
    } catch (error) {
      console.error('Error during playlist sync:', error)
      throw error
    }
  }
}
