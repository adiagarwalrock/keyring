import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site-url'

export const revalidate = false

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: siteUrl ? new URL('/sitemap.xml', siteUrl).toString() : undefined,
  }
}
