/**
 * Generates redirects for legacy WordPress slugs that still exist on the new site,
 * and a review CSV for the rest.
 *
 * Usage (local dev.db):
 *   DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm seo:redirects
 *
 * Usage (production, read-only):
 *   TOKEN=$(grep '^DATABASE_AUTH_TOKEN=' .env | cut -d= -f2)
 *   DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" \
 *     DATABASE_AUTH_TOKEN="$TOKEN" NODE_ENV=production pnpm seo:redirects
 *
 * Writes:
 *   src/config/legacyContentRedirects.json  (explicit 301s for matched content)
 *   data/dumps/legacy-redirect-review.csv   (every legacy URL + its provisional destination)
 *
 * Unmatched flat slugs are intentionally NOT emitted: the single-segment catch-all in
 * src/config/vercelRedirects.ts sends them to /de/news, keeping us under Vercel's
 * 2048-redirect limit.
 *
 * @see src/config/vercelRedirects.ts
 */
import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import config from '@/payload.config'
import { getPayload } from 'payload'

const WP_ROOT = 'https://ks-schoerke.de'
const JSON_OUT = join(process.cwd(), 'src/config/legacyContentRedirects.json')
const CSV_OUT = join(process.cwd(), 'data/dumps/legacy-redirect-review.csv')
const STATUS_CODE = 301

interface Redirect {
  source: string
  destination: string
  statusCode: number
}

/** Per-script convention (scripts/AGENTS.md): abort if targeting prod without NODE_ENV=production. */
function assertProdGuard(): void {
  const isProd = (process.env.DATABASE_URI || '').includes('ksschoerke-production')
  if (isProd && process.env.NODE_ENV !== 'production') {
    console.error('ABORT: production DATABASE_URI requires NODE_ENV=production')
    process.exit(1)
  }
}

/** RFC 4180 field quoting: only quote (and escape embedded quotes) when needed. */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsv(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.join(','), ...rows.map((row) => headers.map((header) => csvField(row[header])).join(','))]
  return `${lines.join('\n')}\n`
}

function normalise(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

async function fetchLocs(url: string): Promise<string[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Sitemap fetch failed: ${url} (${response.status})`)
  const xml = await response.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
}

async function collectLegacyPaths(): Promise<string[]> {
  const sitemaps = await fetchLocs(`${WP_ROOT}/wp-sitemap.xml`)
  const paths = new Set<string>()
  for (const sitemap of sitemaps) {
    try {
      for (const loc of await fetchLocs(sitemap)) {
        paths.add(normalise(new URL(loc).pathname))
      }
    } catch (error) {
      console.warn(`Skipping sub-sitemap (fetch failed): ${sitemap}`, error instanceof Error ? error.message : error)
    }
  }
  return [...paths]
}

interface Slugs {
  artists: Set<string>
  news: Set<string>
  projects: Set<string>
}

async function getNewSlugs(): Promise<Slugs> {
  const payload = await getPayload({ config })
  const [artists, news, projects] = await Promise.all([
    payload.find({
      collection: 'artists',
      depth: 0,
      pagination: false,
      select: { slug: true },
    }),
    payload.find({
      collection: 'posts',
      depth: 0,
      pagination: false,
      select: { slug: true },
      where: { _status: { equals: 'published' }, categories: { contains: 'news' } },
    }),
    payload.find({
      collection: 'posts',
      depth: 0,
      pagination: false,
      select: { slug: true },
      where: { _status: { equals: 'published' }, categories: { contains: 'projects' } },
    }),
  ])

  const slugs = (docs: { slug?: string | null }[]): Set<string> =>
    new Set(docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug)))

  const result = { artists: slugs(artists.docs), news: slugs(news.docs), projects: slugs(projects.docs) }

  const allSlugs = [...result.artists, ...result.news, ...result.projects]
  const seen = new Set<string>()
  const collisions = new Set<string>()
  for (const slug of allSlugs) {
    if (seen.has(slug)) collisions.add(slug)
    seen.add(slug)
  }
  if (collisions.size > 0) {
    console.warn(
      `WARNING: ${collisions.size} slug(s) exist in more than one collection (artists/news/projects) — ` +
        `slugDestination() resolves news > projects > artists, silently picking one: ${[...collisions].join(', ')}`
    )
  }

  return result
}

function slugDestination(slug: string, slugs: Slugs): string | undefined {
  if (slugs.news.has(slug)) return `/de/news/${slug}`
  if (slugs.projects.has(slug)) return `/de/projects/${slug}`
  if (slugs.artists.has(slug)) return `/de/artists/${slug}`
  return undefined
}

function mapPath(path: string, slugs: Slugs): string {
  if (path === '/') return '/'

  const segments = path.split('/').filter(Boolean)
  const [first, second, third] = segments

  if (first === 'kuenstler') return '/de/artists'
  if (first === 'artist' && second) return slugDestination(second, slugs) ?? `/de/artists/${second}`
  if (first === 'employee') return slugDestination(second ?? '', slugs) ?? '/de/team'
  if (first === 'news') return second ? (slugDestination(second, slugs) ?? '/de/news') : '/de/news'
  if (first === 'projekte' && second) return slugDestination(second, slugs) ?? `/de/projects/${second}`
  if (first === 'projekte') return '/de/projects'
  if (path === '/kontakt') return '/de/kontakt'
  if (path === '/impressum') return '/de/impressum'
  if (path === '/datenschutz') return '/de/datenschutz'
  if (path === '/wir-ueber-uns') return '/de/team'
  if (first === 'category' && second === 'kuenstler' && third) return slugDestination(third, slugs) ?? '/de/artists'
  if (first === 'category' || first === 'tag' || first === 'ngg_tag') return '/de/news'
  if (first === 'feed') return '/de/news'

  if (segments.length === 1) {
    return slugDestination(first, slugs) ?? '/de/news'
  }

  return '/de/news'
}

async function main(): Promise<void> {
  assertProdGuard()
  const [paths, slugs] = await Promise.all([collectLegacyPaths(), getNewSlugs()])
  const redirects: Redirect[] = []
  const review: { source: string; destination: string; matched: 'yes' | 'no' }[] = []
  const seen = new Set<string>()

  for (const path of paths) {
    if (path === '/') continue
    const destination = mapPath(path, slugs)
    const isSpecific = /^\/de\/(news|projects|artists)\/[^/]+$/.test(destination)

    review.push({ source: path, destination, matched: isSpecific ? 'yes' : 'no' })

    if (!isSpecific || seen.has(path)) continue
    seen.add(path)
    redirects.push({ source: path, destination, statusCode: STATUS_CODE })
    const trailing = `${path}/`
    if (!seen.has(trailing)) {
      seen.add(trailing)
      redirects.push({ source: trailing, destination, statusCode: STATUS_CODE })
    }
  }

  redirects.sort((a, b) => a.source.localeCompare(b.source))

  await mkdir(dirname(JSON_OUT), { recursive: true })
  await mkdir(dirname(CSV_OUT), { recursive: true })
  await writeFile(JSON_OUT, `${JSON.stringify(redirects, null, 2)}\n`)
  await writeFile(CSV_OUT, toCsv(['source', 'destination', 'matched'], review))

  console.log(`Matched legacy content: ${redirects.length} redirects -> ${JSON_OUT}`)
  console.log(`Review CSV: ${review.length} rows -> ${CSV_OUT}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
