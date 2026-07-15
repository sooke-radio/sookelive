import { withPayload } from '@payloadcms/next/withPayload'

import redirects from './redirects.js'

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
    ],
    // Some content uses quality 100; Next 16 rejects unlisted qualities
    // with a 400 instead of just warning, so both need to be explicit.
    qualities: [75, 100],
  },
  reactStrictMode: true,
  redirects,
  // Dev-only: lets the dev server accept requests (including the HMR
  // websocket) from other hosts on the LAN, e.g. testing via the Docker
  // port mapping's host IP instead of localhost. Extend with more
  // hostnames/IPs as needed; ignored outside development.
  allowedDevOrigins: process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(',') ?? ['10.0.0.142'],
}

export default withPayload(nextConfig)
