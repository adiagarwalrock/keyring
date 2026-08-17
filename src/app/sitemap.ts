import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/site-url'

export const revalidate = false

export default function sitemap(): MetadataRoute.Sitemap {
  return siteUrl ? [{ url: siteUrl.toString(), changeFrequency: 'monthly', priority: 1 }] : []
}
