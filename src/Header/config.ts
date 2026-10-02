import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/access/byRole'
import { isAdminUser } from '@/access/roles'
import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
    update: isAdmin,
  },
  admin: {
    hidden: ({ user }) => !isAdminUser(user),
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 7,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'chatUrl',
      type: 'text',
      label: 'Chat / Discord URL',
      admin: {
        description: 'Links the player\'s LIVE indicator to live chat when a show is live. Leave blank to hide it. For a general chat link in the main menu, add it to Nav Items above instead.',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
