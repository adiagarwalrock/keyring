import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  applicationName: 'Key Ring',
  title: {
    default: 'Key Ring | Browser-only AI API key checker',
    template: '%s | Key Ring',
  },
  description: 'Check which AI provider accepts an API key using direct, read-only browser requests. Keys are never stored or proxied by Key Ring.',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Key Ring',
    title: 'Key Ring | Browser-only AI API key checker',
    description: 'Check AI API keys with direct, read-only browser requests. No proxy and no key storage.',
  },
  twitter: {
    card: 'summary',
    title: 'Key Ring | Browser-only AI API key checker',
    description: 'Check AI API keys with direct, read-only browser requests. No proxy and no key storage.',
  },
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
