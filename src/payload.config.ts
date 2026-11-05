// storage-adapter-import-placeholder
import { s3Storage } from '@payloadcms/storage-s3'
import { mongooseAdapter } from '@payloadcms/db-mongodb'

import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Episodes } from './collections/Episodes'
import { EpisodeAudio } from './collections/EpisodeAudio'
import { Genres } from './collections/Genres'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Shows } from './collections/Shows'
import { Playlists } from './collections/Playlists'
import { Analytics } from './Analytics/config'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { getDatabaseURI } from './utilities/getDatabaseURI'
import { Hosts } from './collections/Hosts'
import { isAuthenticatedOrCronSecret } from '@/access/isAuthenticatedOrCronSecret'

import { default as mailer } from './plugins/mailer'
import { syncAzuracastTask } from './tasks/syncAzuracast'
import { revalidateAllEndpoint } from './endpoints/revalidateAll'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Wasabi storage is mandatory in production (build + runtime); the local-disk
// fallback for episode audio is a dev/test-only shim. Failing loudly here also
// stops a build without S3 vars from baking local /api/... audio URLs into
// statically generated pages. (The Docker build gets these via the baked .env.)
const S3_REQUIRED_VARS = [
  'S3_BUCKET',
  'S3_REGION',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
] as const
const missingS3Vars = S3_REQUIRED_VARS.filter((name) => !process.env[name])
if (process.env.NODE_ENV === 'production' && missingS3Vars.length > 0) {
  throw new Error(
    `Missing required S3 env vars in production: ${missingS3Vars.join(', ')}. ` +
      'Local-disk episode audio is a development-only fallback.',
  )
}
const s3Enabled = missingS3Vars.length === 0

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    // Admin panel is dark-only (this also hides the theme switcher).
    theme: 'dark',
    components: {
      Nav: '@/components/HostNav',
      views: {
        dashboard: {
          Component: '@/components/HostDashboard',
        },
      },
    },
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: getDatabaseURI(),
  }),
  collections: [
    Pages,
    Posts,
    Shows,
    Episodes,
    EpisodeAudio,
    Media,
    Categories,
    Genres,
    Hosts,
    Users,
    Playlists,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, Analytics],
  plugins: [
    ...plugins,
    // Episode audio lives in Wasabi (S3-compatible); media stays on local disk.
    // Each environment has its own bucket (stg: srs-web-audio-stg, prd: srs-web-audio).
    s3Storage({
      alwaysInsertFields: true, // keep the schema (prefix field) identical with or without S3
      enabled: s3Enabled,
      collections: {
        'episode-audio': {
          prefix: 'episode-audio',
          // Private bucket: the file route (/api/episode-audio/file/<name>) runs
          // collection access control, then 302s to a presigned Wasabi URL. The
          // browser streams/seeks from Wasabi directly (Range works). Wasabi
          // accounts can't serve public objects anyway. expiresIn is long (6h)
          // because the player reuses one signed URL for seeks mid-show.
          signedDownloads: { expiresIn: 21600 },
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true,
        region: process.env.S3_REGION,
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET,
  endpoints: [revalidateAllEndpoint],
  sharp,
  upload: {
    limits: { fileSize: 300 * 1024 * 1024 }, // 300MB per file, sized for episode audio
    // Payload also caps the whole multipart request (default 50MB); keep it a
    // little above the file cap to leave room for the other form fields.
    requestSizeLimit: 310 * 1024 * 1024,
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => isAuthenticatedOrCronSecret(req),
    },
    tasks: [
      syncAzuracastTask,
      // other tasks...
    ],
    autoRun: [
      {
        cron: '*/15 * * * *', // every 15 minutes
        queue: 'sync-azuracast',
      },
    ],
    shouldAutoRun: async (payload) => {
      return process.env.NODE_ENV === 'production' || process.env.ENABLE_JOBS === 'true'
    },
  },
  email: mailer,
})
