import type { Payload } from 'payload'

import { azuracastAPI } from '@/stream/azuracast/api'

// Pulls the current playlist set from Azuracast and upserts/deletes local
// `playlists` docs to match. Shared by the `/api/playlists/sync` endpoint
// and the `sync-azuracast` job task so there's one sync implementation
// instead of the task self-HTTP-ing the endpoint.
export async function syncPlaylists(payload: Payload) {
  const playlists = await azuracastAPI.get('playlists')

  await payload.delete({
    collection: 'playlists',
    where: {
      az_id: {
        not_in: playlists.map((playlist) => playlist.id),
      },
    },
  })

  const results = await Promise.all(
    playlists.map(async (playlist) => {
      const existing = await payload.find({
        collection: 'playlists',
        where: {
          az_id: {
            equals: playlist.id,
          },
        },
      })

      const playlistData = {
        az_id: playlist.id,
        name: playlist.name,
        short_name: playlist.short_name,
        schedule_items: playlist.schedule_items ? playlist.schedule_items : null,
        lastSync: new Date().toString(),
      }

      if (existing.totalDocs === 0) {
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

  return results
}
