import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminOrHost, isAdminOrSelf } from '../../access/byRole'
import { isAdminUser, roleOptions } from '../../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: isAdminOrHost,
    create: isAdmin,
    delete: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    // Hosts edit their own account via /admin/account; the list view is
    // admin-only decluttering, not a security boundary (enforced above).
    hidden: ({ user }) => !isAdminUser(user),
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description: 'Controls what this user can access in the admin panel.',
        position: 'sidebar',
      },
      defaultValue: ['host'],
      hasMany: true,
      options: roleOptions,
      required: true,
      saveToJWT: true,
    },
    {
      name: 'discordId',
      type: 'text',
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description:
          'Discord user ID, for linking a Discord account to this user. Not yet used for login.',
        position: 'sidebar',
      },
      unique: true,
    },
    {
      name: 'host',
      type: 'relationship',
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description: 'Links this user to a Hosts profile, granting access to that host’s assigned shows.',
        position: 'sidebar',
      },
      relationTo: 'hosts',
      saveToJWT: true,
    },
  ],
  timestamps: true,
}
