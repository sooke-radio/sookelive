import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon-solid-32.png" rel="icon" sizes="32x32" type="image/png" />
        <link href="/favicon-solid-48.png" rel="icon" sizes="48x48" type="image/png" />
        <link href="/favicon-solid-192.png" rel="icon" sizes="192x192" type="image/png" />
        <link href="/favicon-solid-32.png" rel="apple-touch-icon" sizes="32x32" />
        <link href="/favicon-solid-192.png" rel="apple-touch-icon" sizes="192x192" />
        <link rel="manifest" href="/manifest.json" />
        {process.env.NEXT_PUBLIC_SITE_ENV === 'prd' && (
          <script defer src="https://umami.sooke.live/script.js" data-website-id="fcda2793-d54f-4b8e-98d5-79ef5d457b10"></script>
        )}
      </head>      
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
