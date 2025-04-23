// playlists are loaded from Azuracast API and can be associated with a show
// playlists include schedule info for the associated show


import type { CollectionConfig, PayloadRequest } from 'payload'
import { azuracastAPI } from '@/stream/azuracast/api'
import { revalidatePlaylist, revalidateDelete } from './hooks/revalidatePlaylists'

export const Playlists: CollectionConfig = {
  slug: 'playlists',
  hooks: {
    afterChange: [revalidatePlaylist],
    afterDelete: [revalidateDelete],
  },
  admin: {
    description: 'Playlists are synchronized from Azuracast.',
    components:{
      beforeListTable: [
        '@/components/SyncPlaylists'
      ],
    },
    useAsTitle: 'name',
  },
  fields:[
    {
      name: 'az_id',
      type: 'number',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: false,
    },
    {
      name: 'short_name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'schedule_items',
      type: 'json',
      required: false,
      unique: false,
    },
    {
      name: 'lastSync',
      type: 'date',
      required: true,
    }
  ],
  access: {
      create: () => false,
      delete: () => false,
      read: () => true,
      update: () => false,
  },
  endpoints: [
    {
      path: '/sync',
      method: 'post',
      handler: async (req) => {

        // TODO: authenticate user
        // if (!req.user) {
        //   return Response.json({ error: 'forbidden' }, { status: 403 })
        // }
        const playlists = await azuracastAPI.get('playlists')

        try {
          await req.payload.delete({
            collection: 'playlists',
            where: {
              az_id: {
                not_in: playlists.map(playlist => playlist.id)
              }
            }
          })
          const results = await Promise.all(
            playlists.map(async playlist => {

              const existing = await req.payload.find({
                collection: 'playlists',
                where: {
                  az_id: {
                    equals: playlist.id
                  }
                }
              })

              const playlistData = {
                az_id: playlist.id,
                name: playlist.name,
                short_name: playlist.short_name,
                schedule_items: playlist.schedule_items ? playlist.schedule_items : null,
                lastSync: new Date().toString()
              }

              if (existing.totalDocs === 0) {

                return req.payload.create({
                  collection: 'playlists',
                  data: playlistData
                })

              } else {

                return req.payload.update({
                  collection: 'playlists',
                  where: {
                    az_id: playlist.id
                  },
                  data: playlistData
                })

              }
            })
          )
          return Response.json({
            success: true,
            results: results
          })
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 })
        }
      }
    }
  ]
}

