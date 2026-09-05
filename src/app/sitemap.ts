import type { MetadataRoute } from 'next'
import config from '@/payload.config'
import { getSiteUrl } from '@/utils/siteUrl'
import { getPayload, type Payload } from 'payload'

const LOCALES = ['de', 'en'] as const
const SLUG_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/
const LAST_MODIFIED_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(?:Z|([+-])(\d{2}):(\d{2})))?$/

const STATIC_PATHS = {
  de: ['/artists', '/news', '/projects', '/kontakt', '/impressum', '/datenschutz'],
  en: ['/artists', '/news', '/projects', '/contact', '/imprint', '/privacy-policy'],
} as const

type Locale = (typeof LOCALES)[number]
type DynamicKind = 'artists' | 'news' | 'projects'

interface SitemapDocument {
  id: number
  slug?: string | null
  updatedAt: string
}

interface DynamicSitemapEntry {
  id: number
  kind: DynamicKind
  locale: Locale
  url: string
  lastModified?: string
}

export const revalidate = false

function isSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_PATTERN.test(value)
}

function isLastModified(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const match = LAST_MODIFIED_PATTERN.exec(value)
  if (!match) return false

  const [, year, month, day, hour = '00', minute = '00', second = '00', offsetSign, offsetHour, offsetMinute] = match
  if (
    (offsetHour && Number(offsetHour) > 14) ||
    (offsetHour === '14' && offsetMinute !== '00') ||
    (offsetSign === '-' && Number(offsetHour) > 12) ||
    (offsetSign === '-' && offsetHour === '12' && offsetMinute !== '00') ||
    (offsetMinute && Number(offsetMinute) > 59)
  ) {
    return false
  }

  const expected = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  )

  if (
    expected.getUTCFullYear() !== Number(year) ||
    expected.getUTCMonth() !== Number(month) - 1 ||
    expected.getUTCDate() !== Number(day) ||
    expected.getUTCHours() !== Number(hour) ||
    expected.getUTCMinutes() !== Number(minute) ||
    expected.getUTCSeconds() !== Number(second)
  ) {
    return false
  }

  return Number.isFinite(Date.parse(value))
}

function mapDocuments(
  documents: SitemapDocument[],
  kind: DynamicKind,
  locale: Locale,
  baseUrl: string
): DynamicSitemapEntry[] {
  return documents
    .filter((document) => isSlug(document.slug))
    .map((document) => ({
      id: document.id,
      kind,
      locale,
      url: `${baseUrl}/${locale}/${kind}/${document.slug}`,
      ...(isLastModified(document.updatedAt) ? { lastModified: document.updatedAt } : {}),
    }))
}

async function getEntriesForLocale(payload: Payload, locale: Locale, baseUrl: string): Promise<DynamicSitemapEntry[]> {
  const [artists, news, projects] = await Promise.all([
    payload.find({
      collection: 'artists',
      locale,
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      overrideAccess: false,
      select: { id: true, slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'posts',
      locale,
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      overrideAccess: false,
      select: { id: true, slug: true, updatedAt: true },
      where: { _status: { equals: 'published' }, categories: { contains: 'news' } },
    }),
    payload.find({
      collection: 'posts',
      locale,
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      overrideAccess: false,
      select: { id: true, slug: true, updatedAt: true },
      where: { _status: { equals: 'published' }, categories: { contains: 'projects' } },
    }),
  ])

  return [
    ...mapDocuments(artists.docs, 'artists', locale, baseUrl),
    ...mapDocuments(news.docs, 'news', locale, baseUrl),
    ...mapDocuments(projects.docs, 'projects', locale, baseUrl),
  ]
}

function buildStaticEntries(baseUrl: string): MetadataRoute.Sitemap {
  const dePaths = ['', ...STATIC_PATHS.de]
  const enPaths = ['', ...STATIC_PATHS.en]

  return LOCALES.flatMap((locale) =>
    (locale === 'de' ? dePaths : enPaths).map((_, index) => {
      const languages = {
        de: `${baseUrl}/de${dePaths[index]}`,
        en: `${baseUrl}/en${enPaths[index]}`,
      }
      return { url: languages[locale], alternates: { languages } }
    })
  )
}

function addAlternates(entries: DynamicSitemapEntry[]): MetadataRoute.Sitemap {
  const byDocument = new Map<string, Partial<Record<Locale, DynamicSitemapEntry>>>()

  for (const entry of entries) {
    const key = `${entry.kind}:${entry.id}`
    byDocument.set(key, { ...byDocument.get(key), [entry.locale]: entry })
  }

  return entries.map((entry) => {
    const localized = byDocument.get(`${entry.kind}:${entry.id}`)
    const de = localized?.de
    const en = localized?.en

    return {
      url: entry.url,
      ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
      ...(de && en ? { alternates: { languages: { de: de.url, en: en.url } } } : {}),
    }
  })
}

function deduplicateEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const urls = new Set<string>()
  return entries.filter((entry) => {
    if (urls.has(entry.url)) return false
    urls.add(entry.url)
    return true
  })
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl = getSiteUrl()
  const payload = await getPayload({ config })
  const dynamicEntries = (
    await Promise.all(LOCALES.map((locale) => getEntriesForLocale(payload, locale, baseUrl)))
  ).flat()

  return deduplicateEntries([...buildStaticEntries(baseUrl), ...addAlternates(dynamicEntries)])
}

export default sitemap
