import type { TaskHandler } from 'payload'

export const syncAzuracastTask = {
  slug: 'sync-azuracast',
  name: 'Sync Azuracast Playlists',
  title: 'Sync Azuracast Playlists',
  description: 'Synchronizes playlists from Azuracast and revalidates related content',

  async handler({ input, job, req }) {
    req.payload.logger.info('Running Azuracast playlist sync...')

    try {
      // Deliberately goes through the real HTTP endpoint rather than
      // calling syncPlaylists() directly: this cron-driven task runs on a
      // plain timer with no Next.js request context, but Playlists'
      // afterChange/afterDelete hooks call revalidatePath/revalidateTag,
      // which throw without one ("Invariant: static generation store
      // missing"). Routing through the endpoint puts the sync inside a
      // real Route Handler invocation, where those hooks work correctly -
      // same as when a logged-in admin triggers it from the "Refresh
      // Playlists" button. The endpoint now requires auth, so this sends
      // the same Bearer CRON_SECRET the jobs `run` access check accepts.
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/playlists/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Sync failed with status: ${response.status}`)
      }

      const result = await response.json()
      req.payload.logger.info({ result }, 'Playlist sync completed successfully')

      return {
        output: {
          message: 'Playlist sync completed successfully',
          result
        }
      }
    } catch (error) {
      req.payload.logger.error({ err: error }, 'Error during playlist sync')
      throw error
    }
  }
}
