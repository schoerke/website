import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
// Next 16.3.4 has no public sitemap XML serializer; this validates its route integration contract.
import { resolveSitemap } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'
import { getPayload } from 'payload'

const find = vi.fn()
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ find })),
}))
vi.mock('@/payload.config', () => ({ default: {} }))

import sitemap, { revalidate } from './sitemap'

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = 'https://ks-schoerke.de/'
  })

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    }
  })

  it('disables time-based revalidation', () => {
    expect(revalidate).toBe(false)
  })

  it('includes canonical localized static paths and excludes team', async () => {
    find.mockResolvedValue({ docs: [] })

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toEqual([
      'https://ks-schoerke.de/de',
      'https://ks-schoerke.de/de/artists',
      'https://ks-schoerke.de/de/news',
      'https://ks-schoerke.de/de/projects',
      'https://ks-schoerke.de/de/kontakt',
      'https://ks-schoerke.de/de/impressum',
      'https://ks-schoerke.de/de/datenschutz',
      'https://ks-schoerke.de/en',
      'https://ks-schoerke.de/en/artists',
      'https://ks-schoerke.de/en/news',
      'https://ks-schoerke.de/en/projects',
      'https://ks-schoerke.de/en/contact',
      'https://ks-schoerke.de/en/imprint',
      'https://ks-schoerke.de/en/privacy-policy',
    ])
    expect(urls).not.toContain('https://ks-schoerke.de/de/team')
    expect(urls).not.toContain('https://ks-schoerke.de/en/team')
  })

  it('uses the configured HTTPS preview origin for sitemap URLs', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.test/'
    find.mockResolvedValue({ docs: [] })

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toContain('https://preview.example.test/de')
    expect(urls).toContain('https://preview.example.test/en')
  })

  it('adds reciprocal alternates to all paired static URLs', async () => {
    find.mockResolvedValue({ docs: [] })

    const entries = await sitemap()

    expect(entries).toEqual(
      expect.arrayContaining([
        {
          url: 'https://ks-schoerke.de/de',
          alternates: { languages: { de: 'https://ks-schoerke.de/de', en: 'https://ks-schoerke.de/en' } },
        },
        {
          url: 'https://ks-schoerke.de/en',
          alternates: { languages: { de: 'https://ks-schoerke.de/de', en: 'https://ks-schoerke.de/en' } },
        },
        {
          url: 'https://ks-schoerke.de/de/kontakt',
          alternates: {
            languages: {
              de: 'https://ks-schoerke.de/de/kontakt',
              en: 'https://ks-schoerke.de/en/contact',
            },
          },
        },
        {
          url: 'https://ks-schoerke.de/en/privacy-policy',
          alternates: {
            languages: {
              de: 'https://ks-schoerke.de/de/datenschutz',
              en: 'https://ks-schoerke.de/en/privacy-policy',
            },
          },
        },
      ])
    )
  })

  it('queries public content once per kind and locale with public access controls', async () => {
    find.mockResolvedValue({ docs: [] })

    await sitemap()

    expect(getPayload).toHaveBeenCalledTimes(1)
    expect(find).toHaveBeenCalledTimes(6)
    expect(find.mock.calls.map(([options]) => options)).toEqual(
      expect.arrayContaining([
        {
          collection: 'artists',
          locale: 'de',
          depth: 0,
          fallbackLocale: false,
          limit: 0,
          overrideAccess: false,
          select: { id: true, slug: true, updatedAt: true },
        },
        {
          collection: 'artists',
          locale: 'en',
          depth: 0,
          fallbackLocale: false,
          limit: 0,
          overrideAccess: false,
          select: { id: true, slug: true, updatedAt: true },
        },
        ...(['de', 'en'] as const).flatMap((locale) => [
          {
            collection: 'posts',
            locale,
            depth: 0,
            fallbackLocale: false,
            limit: 0,
            overrideAccess: false,
            select: { id: true, slug: true, updatedAt: true },
            where: { _status: { equals: 'published' }, categories: { contains: 'news' } },
          },
          {
            collection: 'posts',
            locale,
            depth: 0,
            fallbackLocale: false,
            limit: 0,
            overrideAccess: false,
            select: { id: true, slug: true, updatedAt: true },
            where: { _status: { equals: 'published' }, categories: { contains: 'projects' } },
          },
        ]),
      ])
    )
  })

  it('pairs localized dynamic URLs and preserves document timestamps', async () => {
    find.mockImplementation(({ collection, locale, where }) => {
      if (collection === 'artists') {
        return {
          docs: [
            {
              id: 1,
              slug: locale === 'de' ? 'kuenstler' : 'artist',
              updatedAt: '2026-09-01T00:00:00.000Z',
            },
          ],
        }
      }
      if (where.categories.contains === 'news') {
        return {
          docs: [
            {
              id: 2,
              slug: locale === 'de' ? 'neu' : 'news',
              updatedAt: '2026-09-02T00:00:00.000Z',
            },
          ],
        }
      }
      return { docs: [] }
    })

    const entries = await sitemap()

    expect(entries).toEqual(
      expect.arrayContaining([
        {
          url: 'https://ks-schoerke.de/de/artists/kuenstler',
          lastModified: '2026-09-01T00:00:00.000Z',
          alternates: {
            languages: {
              de: 'https://ks-schoerke.de/de/artists/kuenstler',
              en: 'https://ks-schoerke.de/en/artists/artist',
            },
          },
        },
        {
          url: 'https://ks-schoerke.de/en/artists/artist',
          lastModified: '2026-09-01T00:00:00.000Z',
          alternates: {
            languages: {
              de: 'https://ks-schoerke.de/de/artists/kuenstler',
              en: 'https://ks-schoerke.de/en/artists/artist',
            },
          },
        },
        {
          url: 'https://ks-schoerke.de/de/news/neu',
          lastModified: '2026-09-02T00:00:00.000Z',
          alternates: {
            languages: {
              de: 'https://ks-schoerke.de/de/news/neu',
              en: 'https://ks-schoerke.de/en/news/news',
            },
          },
        },
      ])
    )
  })

  it.each(['September 2, 2026', '2026-02-30', '2026-09-02T00:00:00'])(
    'omits lastModified for dynamic entries with an invalid timestamp: %s',
    async (updatedAt) => {
      find.mockImplementation(({ collection, locale }) => {
        if (collection === 'artists' && locale === 'de') {
          return { docs: [{ id: 1, slug: 'artist', updatedAt }] }
        }
        return { docs: [] }
      })

      const entries = await sitemap()

      expect(entries).toContainEqual({ url: 'https://ks-schoerke.de/de/artists/artist' })
    }
  )

  it('preserves a dynamic timestamp with an ISO offset timezone', async () => {
    find.mockImplementation(({ collection, locale }) => {
      if (collection === 'artists' && locale === 'de') {
        return { docs: [{ id: 1, slug: 'artist', updatedAt: '2026-09-02T01:00:00+01:00' }] }
      }
      return { docs: [] }
    })

    const entries = await sitemap()

    expect(entries).toContainEqual({
      url: 'https://ks-schoerke.de/de/artists/artist',
      lastModified: '2026-09-02T01:00:00+01:00',
    })
  })

  it.each(['2026-09-02T00:00:00+14:01', '2026-09-02T00:00:00+23:59', '2026-09-02T00:00:00-23:59'])(
    'omits lastModified for an out-of-range timezone offset: %s',
    async (updatedAt) => {
      find.mockImplementation(({ collection, locale }) => {
        if (collection === 'artists' && locale === 'de') {
          return { docs: [{ id: 1, slug: 'artist', updatedAt }] }
        }
        return { docs: [] }
      })

      const entries = await sitemap()

      expect(entries).toContainEqual({ url: 'https://ks-schoerke.de/de/artists/artist' })
    }
  )

  it.each(['2026-09-02T00:00:00-12:01', '2026-09-02T00:00:00-13:00', '2026-09-02T00:00:00-14:00'])(
    'omits lastModified for a timezone offset below -12:00: %s',
    async (updatedAt) => {
      find.mockImplementation(({ collection, locale }) => {
        if (collection === 'artists' && locale === 'de') {
          return { docs: [{ id: 1, slug: 'artist', updatedAt }] }
        }
        return { docs: [] }
      })

      const entries = await sitemap()

      expect(entries).toContainEqual({ url: 'https://ks-schoerke.de/de/artists/artist' })
    }
  )

  it.each(['2026-09-02T00:00:00+14:00', '2026-09-02T00:00:00-12:00'])(
    'preserves a dynamic timestamp at a valid timezone offset boundary: %s',
    async (updatedAt) => {
      find.mockImplementation(({ collection, locale }) => {
        if (collection === 'artists' && locale === 'de') {
          return { docs: [{ id: 1, slug: 'artist', updatedAt }] }
        }
        return { docs: [] }
      })

      const entries = await sitemap()

      expect(entries).toContainEqual({
        url: 'https://ks-schoerke.de/de/artists/artist',
        lastModified: updatedAt,
      })
    }
  )

  it('includes a post assigned to news and projects in both sitemap sections', async () => {
    find.mockImplementation(({ collection, locale, where }) => {
      if (collection !== 'posts' || locale !== 'de') return { docs: [] }

      if (where.categories.contains === 'news') {
        return { docs: [{ id: 3, slug: 'mehrfach-kategorisiert', updatedAt: '2026-09-03T00:00:00.000Z' }] }
      }

      if (where.categories.contains === 'projects') {
        return { docs: [{ id: 3, slug: 'mehrfach-kategorisiert', updatedAt: '2026-09-03T00:00:00.000Z' }] }
      }

      return { docs: [] }
    })

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toContain('https://ks-schoerke.de/de/news/mehrfach-kategorisiert')
    expect(urls).toContain('https://ks-schoerke.de/de/projects/mehrfach-kategorisiert')
  })

  it('serializes static and dynamic sitemap entries as XML', async () => {
    find.mockImplementation(({ collection, locale }) => {
      if (collection === 'artists') {
        return {
          docs: [
            {
              id: 1,
              slug: locale === 'de' ? 'kuenstler' : 'artist',
              updatedAt: '2026-09-01T00:00:00.000Z',
            },
          ],
        }
      }
      return { docs: [] }
    })

    const xml = resolveSitemap(await sitemap())
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml)
    const entries = parsed.urlset.url as Array<{
      loc: string
      lastmod?: string
      'xhtml:link'?: Array<{ '@_rel': string; '@_hreflang': string; '@_href': string }>
    }>

    expect(entries).toContainEqual(
      expect.objectContaining({
        loc: 'https://ks-schoerke.de/de/kontakt',
        'xhtml:link': expect.arrayContaining([
          expect.objectContaining({
            '@_rel': 'alternate',
            '@_hreflang': 'de',
            '@_href': 'https://ks-schoerke.de/de/kontakt',
          }),
          expect.objectContaining({
            '@_rel': 'alternate',
            '@_hreflang': 'en',
            '@_href': 'https://ks-schoerke.de/en/contact',
          }),
        ]),
      })
    )
    expect(entries).toContainEqual(
      expect.objectContaining({
        loc: 'https://ks-schoerke.de/de/artists/kuenstler',
        lastmod: '2026-09-01T00:00:00.000Z',
        'xhtml:link': expect.arrayContaining([
          expect.objectContaining({
            '@_rel': 'alternate',
            '@_hreflang': 'de',
            '@_href': 'https://ks-schoerke.de/de/artists/kuenstler',
          }),
          expect.objectContaining({
            '@_rel': 'alternate',
            '@_hreflang': 'en',
            '@_href': 'https://ks-schoerke.de/en/artists/artist',
          }),
        ]),
      })
    )
  })

  it('omits missing and unsafe slugs', async () => {
    find.mockImplementation(({ collection, locale }) => {
      if (collection === 'artists' && locale === 'de') {
        return {
          docs: [
            { id: 1, slug: '', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 2, slug: 'bad/slug', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 3, slug: 'bad?query', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 4, slug: 'bad#fragment', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 5, slug: 'bad%encoded', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 6, slug: 'bad space', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 7, slug: 'valid-slug-2', updatedAt: '2026-09-01T00:00:00.000Z' },
          ],
        }
      }
      return { docs: [] }
    })

    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toContain('https://ks-schoerke.de/de/artists/valid-slug-2')
    expect(urls).not.toContain('https://ks-schoerke.de/de/artists/')
    expect(urls).not.toContain('https://ks-schoerke.de/de/artists/bad/slug')
    expect(urls).not.toContain('https://ks-schoerke.de/de/artists/bad?query')
    expect(urls).not.toContain('https://ks-schoerke.de/de/artists/bad#fragment')
    expect(urls).not.toContain('https://ks-schoerke.de/de/artists/bad%encoded')
    expect(urls).not.toContain('https://ks-schoerke.de/de/artists/bad space')
  })

  it('emits a one-locale dynamic URL without alternates', async () => {
    find.mockImplementation(({ collection, locale }) => {
      if (collection === 'artists' && locale === 'de') {
        return { docs: [{ id: 1, slug: 'nur-deutsch', updatedAt: '2026-09-01T00:00:00.000Z' }] }
      }
      return { docs: [] }
    })

    const entries = await sitemap()

    expect(entries).toContainEqual({
      url: 'https://ks-schoerke.de/de/artists/nur-deutsch',
      lastModified: '2026-09-01T00:00:00.000Z',
    })
  })

  it('does not fabricate an alternate from fallback-like localized data', async () => {
    find.mockImplementation(({ collection, locale }) => {
      if (collection === 'artists' && locale === 'de') {
        return { docs: [{ id: 1, slug: 'nur-deutsch', updatedAt: '2026-09-01T00:00:00.000Z' }] }
      }
      return { docs: [] }
    })

    const entries = await sitemap()

    expect(entries).toContainEqual({
      url: 'https://ks-schoerke.de/de/artists/nur-deutsch',
      lastModified: '2026-09-01T00:00:00.000Z',
    })
    expect(entries.map((entry) => entry.url)).not.toContain('https://ks-schoerke.de/en/artists/nur-deutsch')
    for (const [options] of find.mock.calls) {
      expect(options).toMatchObject({ fallbackLocale: false })
    }
  })

  it('suppresses duplicate URLs', async () => {
    find.mockImplementation(({ collection, locale }) => {
      if (collection === 'artists' && locale === 'de') {
        return {
          docs: [
            { id: 1, slug: 'artist', updatedAt: '2026-09-01T00:00:00.000Z' },
            { id: 1, slug: 'artist', updatedAt: '2026-09-01T00:00:00.000Z' },
          ],
        }
      }
      return { docs: [] }
    })

    const urls = (await sitemap()).map((entry) => entry.url)

    expect(new Set(urls).size).toBe(urls.length)
  })

  it('rejects malformed configured origins', async () => {
    for (const origin of ['http://example.test', 'https://example.test/path', 'invalid']) {
      process.env.NEXT_PUBLIC_SITE_URL = origin
      await expect(sitemap()).rejects.toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')
    }
  })

  it('propagates Payload errors', async () => {
    find.mockRejectedValue(new Error('Payload unavailable'))

    await expect(sitemap()).rejects.toThrow('Payload unavailable')
  })
})
