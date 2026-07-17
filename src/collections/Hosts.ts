import type { Access, CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { getHostId } from '../access/assignedShows'
import { isAdmin } from '../access/byRole'
import { isAdminUser } from '../access/roles'
import { slugField } from '@/fields/slug'

const updateOwnHostProfile: Access = ({ req: { user } }) => {
  if (isAdminUser(user)) return true

  const hostId = getHostId(user)
  if (!hostId) return false

  return {
    id: {
      equals: hostId,
    },
  }
}

export const Hosts: CollectionConfig = {
  slug: 'hosts',
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: anyone,
    update: updateOwnHostProfile,
  },
  admin: {
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
