import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { isAdminOrHost } from '../access/byRole'
import { isAdminUser } from '../access/roles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const setUploadedBy: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && req.user) {
    return { ...data, uploadedBy: req.user.id }
  }
  return data
}

const isAdminOrOwnUpload: Access = ({ req: { user } }) => {
  if (isAdminUser(user)) return true
  if (!user) return false

  return {
    uploadedBy: {
      equals: user.id,
    },
  }
}

export const EpisodeAudio: CollectionConfig = {
  slug: 'episode-audio',
  access: {
    create: isAdminOrHost,
    delete: isAdminOrOwnUpload,
    read: anyone,
    update: isAdminOrOwnUpload,
  },
  admin: {
    hidden: ({ user }) => !isAdminUser(user),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        readOnly: true,
      },
      relationTo: 'users',
    },
  ],
  hooks: {
    beforeChange: [setUploadedBy],
  },
  upload: {
    // Local disk for now; moves to Wasabi S3 in a later phase.
    staticDir: path.resolve(dirname, '../../public/episode-audio'),
    mimeTypes: ['audio/*'],
  },
}
