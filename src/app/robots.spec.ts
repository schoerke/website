import { afterEach, describe, expect, it } from 'vitest'
import robots from './robots'

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  }
})

describe('robots', () => {
  it('allows public crawling, protects non-public routes, and advertises sitemap', () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api', '/api/', '/de/preview/', '/en/preview/'],
      },
      sitemap: 'https://ks-schoerke.de/sitemap.xml',
    })
  })

  it('advertises the configured HTTPS preview sitemap', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.test/'

    expect(robots().sitemap).toBe('https://preview.example.test/sitemap.xml')
  })
})
