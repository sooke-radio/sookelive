import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { isAdmin } from '../access/byRole'
import { isAdminUser } from '../access/roles'
import { slugField } from '@/fields/slug'

export const Genres: CollectionConfig = {
  slug: 'genres',
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: anyone,
    update: isAdmin,
  },
  admin: {
    hidden: ({ user }) => !isAdminUser(user),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
  ],
}
