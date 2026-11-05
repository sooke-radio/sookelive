import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { isAdminOrHost } from '../access/byRole'
import { isAdminUser } from '../access/roles'
import { addXingHeader, isMp3Upload } from '../utilities/mp3Xing'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const setUploadedBy: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && req.user) {
    return { ...data, uploadedBy: req.user.id }
  }
  return data
}

// Firefox scans an entire MP3 that lacks a Xing/Info header before it starts
// playing (very slow for 100MB+ shows). Insert the header losslessly before the
// file is stored. Runs ahead of the storage plugin's own hooks, which upload
// whatever req.file holds. Any failure falls back to the original bytes.
const addMp3Header: CollectionBeforeChangeHook = ({ data, req }) => {
  const file = req.file
  if (!file || !Buffer.isBuffer(file.data) || !isMp3Upload(file)) return data
  try {
    const fixed = addXingHeader(file.data)
    if (fixed) {
      file.data = fixed
      file.size = fixed.length
      return { ...data, filesize: fixed.length }
    }
  } catch (err) {
    req.payload.logger.warn({ err, msg: 'Could not add MP3 Xing header; storing original file' })
  }
  return data
}

// Server-side fallback for creates that bypass the admin title field (API,
// drawers): default the title to the uploaded filename without its extension.
const defaultTitleFromFilename: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' && !data.title) {
    const name: string | undefined = req.file?.name ?? data.filename
    if (name) return { ...data, title: name.replace(/\.[^.]+$/, '') }
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
    // Title and original filename are both searchable, so files with
    // poor names can still be found by either.
    defaultColumns: ['title', 'filename', 'show', 'uploadedBy', 'createdAt', 'filesize'],
    hidden: ({ user }) => !isAdminUser(user),
    listSearchableFields: ['title', 'filename', 'notes'],
    useAsTitle: 'title',
  },
  defaultSort: '-createdAt',
  fields: [
    {
      // UI-only (no stored data): banner shown while a file is uploading.
      name: 'uploadStatus',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/UploadStatus',
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        components: {
          Field: '@/components/EpisodeAudioTitle',
        },
        description: 'Defaults to the filename; edit as needed.',
      },
    },
    {
      // System-managed: the shows of every episode that uses this file, kept in
      // sync by the Episodes hooks (see Episodes/hooks/syncAudioShows.ts).
      name: 'show',
      type: 'relationship',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        description: 'Set automatically from the episodes using this file.',
        readOnly: true,
      },
      hasMany: true,
      index: true,
      relationTo: 'shows',
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Optional: anything that helps find this file later (guest, topic, date).',
      },
    },
    {
      // Virtual: episodes that use this file. Empty means the file is unused.
      name: 'episodes',
      type: 'join',
      admin: {
        description: 'Episodes using this audio file. Empty = not attached to any episode.',
      },
      collection: 'episodes',
      on: 'audio',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        description: 'Set automatically to the uploading user.',
        readOnly: true,
      },
      // Shown pre-filled with the current user on new uploads; the beforeChange
      // hook below is the authoritative setter (access.create is false).
      defaultValue: ({ user }) => user?.id,
      relationTo: 'users',
    },
  ],
  hooks: {
    beforeChange: [addMp3Header, setUploadedBy, defaultTitleFromFilename],
  },
  upload: {
    // Dev/test-only shim: used when the S3 env vars are unset. Production
    // refuses to start without them (payload.config.ts), and the s3Storage
    // plugin stores files in Wasabi instead whenever they are set.
    staticDir: path.resolve(dirname, '../../public/episode-audio'),
    mimeTypes: ['audio/*'],
  },
}
