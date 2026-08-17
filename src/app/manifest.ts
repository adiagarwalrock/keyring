import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Key Ring',
    short_name: 'Key Ring',
    description: 'A browser-only checker for AI API keys.',
    start_url: '/',
    display: 'standalone',
    background_color: '#112319',
    theme_color: '#112319',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
