const DEFAULT_SITE_URL = 'https://ks-schoerke.de'
const INVALID_SITE_URL_ERROR = 'NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL'

export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL

  try {
    const url = new URL(siteUrl)

    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(INVALID_SITE_URL_ERROR)
    }

    return url.origin
  } catch {
    throw new Error(INVALID_SITE_URL_ERROR)
  }
}
