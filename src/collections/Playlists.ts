// playlists are loaded from Azuracast API and can be associated with a show
// playlists include schedule info for the associated show


import type { CollectionConfig, PayloadRequest } from 'payload'
import { azuracastAPI } from '@/stream/azuracast/api'

export const Playlists: CollectionConfig = {
  slug: 'playlists',
  admin: {
    description: 'Playlists synchronized from Azuracast.',
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
        // console.log(req, playlists)

        await req.payload.delete({
          collection: 'playlists',
          where: {}
        })
        try {
          const results = await Promise.all(
            playlists.map(playlist => {
              console.log('setplaylist - ', playlist)
              req.payload.create({
                collection: 'playlists',
                data: {
                  az_id: playlist.id,
                  name: playlist.name,
                  short_name: playlist.short_name,
                  schedule_items: playlist.schedule_items ? playlist.schedule_items : null,
                  lastSync: new Date().toString()
                },
              })
            }
            )
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

