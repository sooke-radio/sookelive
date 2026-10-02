import { PayloadRequest, CollectionSlug } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
  shows: '/shows',
  episodes: '/episodes',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = ({ collection, slug, req }: Props) => {
  const path = `${collectionPrefixMap[collection]}/${slug}`

  const params = {
    slug,
    collection,
    path,
  }

  const encodedParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    encodedParams.append(key, value)
  })

  const isProduction =
    process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  const protocol = isProduction ? 'https:' : req.protocol

  // Prefer the host the browser actually used to reach us over
  // NEXT_PUBLIC_SERVER_URL: the preview iframe/link is loaded by that same
  // browser, so it needs an origin the browser can reach. NEXT_PUBLIC_SERVER_URL
  // is a fixed value (e.g. localhost:3000) that's wrong whenever the admin is
  // accessed via a different host, like a LAN IP in cc-container dev.
  const root = req.host ? `${protocol}//${req.host}` : process.env.NEXT_PUBLIC_SERVER_URL || ''

  const url = `${root}/next/preview?${encodedParams.toString()}`

  return url
}
