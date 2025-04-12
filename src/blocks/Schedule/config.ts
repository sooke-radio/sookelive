import type { Block } from 'payload'

export const MediaBlock: Block = {
  slug: 'scheduleBlock',
  interfaceName: 'scheduleBlock',
  fields: [
    {
      name: 'playlists',
      type: 'relationship',
      relationTo: 'playlists',
      required: false,
    },
  ],
}
