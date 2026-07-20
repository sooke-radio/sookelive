import type { Payload } from 'payload'

import { azuracastAPI } from '@/stream/azuracast/api'

// Pulls the current playlist set from Azuracast and upserts/deletes local
// `playlists` docs to match. This is the one sync implementation, used by
// the `/api/playlists/sync` endpoint. The `sync-azuracast` job task still
// calls that endpoint over HTTP rather than this function directly - see
// src/tasks/syncAzuracast.ts for why (it needs real Next.js request
// context for the collection's revalidate hooks to work).
export async function syncPlaylists(payload: Payload) {
  const playlists = await azuracastAPI.get('playlists')

  if (playlists.length === 0) {
    // Azuracast returning zero playlists is indistinguishable here from a
    // transient API/network hiccup degrading to an empty response - trusting
    // it would wipe every local playlist via the `not_in` delete below. Skip
    // the sync and surface a warning instead of destroying data on a guess.
    const warning =
      'Azuracast returned zero playlists - skipping sync to avoid deleting all local playlists. Retry, or confirm Azuracast genuinely has no playlists configured.'
    payload.logger.warn(warning)
    return { warning, results: [] }
  }

  const azIds = playlists.map((playlist) => playlist.id)

  const [, existingByAzId] = await Promise.all([
    payload.delete({
      collection: 'playlists',
      where: {
        az_id: {
          not_in: azIds,
        },
      },
    }),
    // One query for every playlist's existence instead of one per
    // playlist - this runs on every cron tick (see src/tasks/
    // syncAzuracast.ts), so an N+1 here recurs on a fixed schedule.
    payload
      .find({
        collection: 'playlists',
        where: {
          az_id: {
            in: azIds,
          },
        },
        pagination: false,
      })
      .then((result) => new Map(result.docs.map((doc) => [doc.az_id, doc]))),
  ])

  const results = await Promise.all(
    playlists.map((playlist) => {
      const playlistData = {
        az_id: playlist.id,
        name: playlist.name,
        short_name: playlist.short_name,
        schedule_items: playlist.schedule_items ? playlist.schedule_items : null,
        is_enabled: playlist.is_enabled ?? true,
        lastSync: new Date().toString(),
      }

      if (!existingByAzId.has(playlist.id)) {
        return payload.create({
          collection: 'playlists',
          data: playlistData,
        })
      }

      return payload.update({
        collection: 'playlists',
        where: {
          az_id: {
            equals: playlist.id,
          },
        },
        data: playlistData,
      })
    }),
  )

  return { warning: null, results }
}
