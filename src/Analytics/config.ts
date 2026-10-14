import type { GlobalConfig, TextFieldSingleValidation } from 'payload'

import { isAdmin } from '@/access/byRole'
import { isAdminUser } from '@/access/roles'
import { revalidateAnalytics } from './hooks/revalidateAnalytics'

const validateScriptSrc: TextFieldSingleValidation = (value) => {
  if (!value) return true
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return 'Script URL must start with https://'
  } catch {
    return 'Enter a full URL, e.g. https://umami.example.com/script.js'
  }
  return true
}

const validateWebsiteId: TextFieldSingleValidation = (value) => {
  if (!value) return true
  return /^[A-Za-z0-9-]+$/.test(value) || 'Website ID may only contain letters, numbers and dashes'
}

export const Analytics: GlobalConfig = {
  slug: 'analytics',
  label: 'Analytics',
  access: {
    read: () => true,
    update: isAdmin,
  },
  admin: {
    hidden: ({ user }) => !isAdminUser(user),
  },
  fields: [
    {
      name: 'umamiSrc',
      label: 'Umami script URL (src)',
      type: 'text',
      validate: validateScriptSrc,
      admin: {
        description:
          'The src value of your Umami tracking script. Leave blank (with the website ID) to disable tracking.',
        placeholder: 'https://umami.example.com/script.js',
      },
    },
    {
      name: 'umamiWebsiteId',
      label: 'Umami website ID (data-website-id)',
      type: 'text',
      validate: validateWebsiteId,
      admin: {
        description: 'The data-website-id value of your Umami tracking script.',
      },
    },
  ],
  hooks: {
    afterChange: [revalidateAnalytics],
  },
}
