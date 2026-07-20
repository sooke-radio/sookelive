// playlists are loaded from Azuracast API and can be associated with a show
// playlists include schedule info for the associated show


import type { CollectionConfig } from 'payload'
import { isAuthenticatedOrCronSecret } from '@/access/isAuthenticatedOrCronSecret'
import { revalidatePlaylist, revalidateDelete } from './hooks/revalidatePlaylists'
import { syncPlaylists } from './syncPlaylists'

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
      name: 'is_enabled',
      type: 'checkbox',
      required: true,
      defaultValue: true,
      admin: {
        description: 'Mirrors the playlist enabled/disabled toggle in Azuracast.',
      },
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
        if (!isAuthenticatedOrCronSecret(req)) {
          return Response.json({ error: 'forbidden' }, { status: 401 })
        }

        try {
          const { warning, results } = await syncPlaylists(req.payload)
          return Response.json({
            success: true,
            warning,
            results,
          })
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 })
        }
      }
    }
  ]
}

