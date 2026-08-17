function urlFrom(value: string | undefined): URL | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

export const siteUrl = urlFrom(process.env.NEXT_PUBLIC_SITE_URL)
