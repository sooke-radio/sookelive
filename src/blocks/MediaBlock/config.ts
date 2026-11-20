import type { Block } from 'payload'
import { imageOrVideo } from '@/fields/imageOnly'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  fields: [
    {
      name: 'media',
      type: 'upload',
      filterOptions: imageOrVideo,
      relationTo: 'media',
      required: true,
    },
  ],
}
