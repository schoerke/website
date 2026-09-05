import { afterEach, describe, expect, it } from 'vitest'
import { getSiteUrl } from './siteUrl'

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  }
})

describe('getSiteUrl', () => {
  it('returns default site URL when environment variable is absent', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL

    expect(getSiteUrl()).toBe('https://ks-schoerke.de')
  })

  it('returns HTTPS environment URL as an origin without trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://staging.ks-schoerke.de/'

    expect(getSiteUrl()).toBe('https://staging.ks-schoerke.de')
  })

  it('rejects an empty configured site URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = ''

    expect(getSiteUrl).toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')
  })

  it('rejects a site URL with credentials', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://user:password@ks-schoerke.de'

    expect(getSiteUrl).toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')
  })

  it.each([
    'not a URL',
    'http://ks-schoerke.de',
    'https://ks-schoerke.de/news',
    'https://ks-schoerke.de?preview=true',
    'https://ks-schoerke.de#contact',
  ])('rejects invalid site URL %s', (siteUrl) => {
    process.env.NEXT_PUBLIC_SITE_URL = siteUrl

    expect(getSiteUrl).toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')
  })
})
