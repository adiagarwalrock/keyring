import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

const description = 'Check which AI provider accepts an API key using direct, read-only browser requests. Keys are never stored or proxied by Key Ring.'

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Key Ring',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      description,
      featureList: ['AI API key provider detection', 'Direct browser requests', 'Read-only verification requests', 'No key storage'],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What is Key Ring?', acceptedAnswer: { '@type': 'Answer', text: 'Key Ring is a browser-only tool that checks which selected AI providers accept an API key using read-only verification requests.' } },
        { '@type': 'Question', name: 'Does Key Ring store API keys?', acceptedAnswer: { '@type': 'Answer', text: 'No. The key remains in browser memory and is removed when the page is refreshed or the user clears it.' } },
        { '@type': 'Question', name: 'Where does Key Ring send an API key?', acceptedAnswer: { '@type': 'Answer', text: 'Only to the AI provider domains selected by the user, directly from the browser. Key Ring does not proxy the request.' } },
      ],
    },
  ],
}

export const metadata: Metadata = {
  applicationName: 'Key Ring',
  title: {
    default: 'Key Ring | Browser-only AI API key checker',
    template: '%s | Key Ring',
  },
  description,
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
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} type="application/ld+json" />
      </body>
    </html>
  )
}
