# Robots and Sitemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish safe crawler rules and a cache-invalidated, localized sitemap of all indexable public pages.

**Architecture:** Next metadata routes serve `/robots.txt` and `/sitemap.xml`. One shared site-origin helper drives both routes. `sitemap.ts` reads slim documents through Payload Local API, creates static and valid localized dynamic entries, and emits `hreflang` alternates only where both locale URLs exist. Artist and post cache hooks invalidate `/sitemap.xml` after visible content changes and deletion; route output stays cached until this on-demand invalidation, deployment, or cache eviction.

**Tech Stack:** Next.js 16 metadata routes, TypeScript, Payload CMS Local API, Vitest.

---

## File Structure

- Create `src/utils/siteUrl.ts`: normalized canonical HTTPS origin shared by metadata routes.
- Create `src/utils/siteUrl.spec.ts`: configured-origin and invalid-origin tests.
- Create `src/app/robots.ts`: crawler policy and sitemap discovery URL using shared origin.
- Create `src/app/sitemap.ts`: static route matrix, Payload queries, locale pairing, timestamp validation, typed metadata entries.
- Create `src/app/robots.spec.ts`: robots policy tests.
- Create `src/app/sitemap.spec.ts`: Local API mock and sitemap behavior tests.
- Modify `src/collections/hooks/revalidateArtist.ts`: invalidate sitemap for artist changes/deletes.
- Modify `src/collections/hooks/revalidateArtist.spec.ts`: assert sitemap invalidation.
- Modify `src/collections/hooks/revalidatePost.ts`: invalidate sitemap for published post changes/deletes.
- Modify `src/collections/hooks/revalidatePost.spec.ts`: assert sitemap invalidation.

### Task 1: Add Shared Site Origin Helper

**Files:**
- Create: `src/utils/siteUrl.ts`
- Test: `src/utils/siteUrl.spec.ts`

- [ ] **Step 1: Write failing origin tests**

```ts
import { describe, expect, it } from 'vitest'
import { getSiteUrl } from './siteUrl'

describe('getSiteUrl', () => {
  it('normalizes an HTTPS origin and falls back to production', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getSiteUrl()).toBe('https://ks-schoerke.de')

    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.test/'
    expect(getSiteUrl()).toBe('https://preview.example.test')
  })

  it.each(['http://example.test', 'https://example.test/path', 'https://example.test?x=1', 'not a URL'])(
    'rejects invalid value %s',
    (value) => {
      process.env.NEXT_PUBLIC_SITE_URL = value
      expect(() => getSiteUrl()).toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')
    }
  )
})
```

- [ ] **Step 2: Run test; confirm failure**

Run: `pnpm test src/utils/siteUrl.spec.ts`

Expected: FAIL. Module `./siteUrl` does not exist.

- [ ] **Step 3: Implement minimal origin helper**

```ts
const DEFAULT_SITE_URL = 'https://ks-schoerke.de'

export function getSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
      throw new Error()
    }
    return url.origin
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')
  }
}
```

- [ ] **Step 4: Run test; confirm pass**

Run: `pnpm test src/utils/siteUrl.spec.ts`

Expected: PASS.

### Task 2: Add Robots Metadata Route

**Files:**
- Create: `src/app/robots.ts`
- Test: `src/app/robots.spec.ts`
- Modify: `src/utils/siteUrl.ts`

- [ ] **Step 1: Write failing robots policy test with configured origin**

```ts
import { afterEach, describe, expect, it } from 'vitest'
import robots from './robots'

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
})

describe('robots', () => {
  it('allows public crawling, protects non-public routes, and advertises configured sitemap', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.test/'
    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api', '/api/', '/de/preview/', '/en/preview/'],
      },
      sitemap: 'https://preview.example.test/sitemap.xml',
    })
  })
})
```

- [ ] **Step 2: Run test; confirm failure**

Run: `pnpm test src/app/robots.spec.ts`

Expected: FAIL. Robots sitemap URL remains hard-coded.

- [ ] **Step 3: Implement robots route with shared origin**

```ts
import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/utils/siteUrl'

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/admin', '/admin/', '/api', '/api/', '/de/preview/', '/en/preview/'],
  },
  sitemap: `${getSiteUrl()}/sitemap.xml`,
})

export default robots
```

- [ ] **Step 4: Run test; confirm pass**

Run: `pnpm test src/app/robots.spec.ts`

Expected: PASS.

### Task 3: Add Sitemap Route Tests

**Files:**
- Create: `src/app/sitemap.spec.ts`
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Write failing sitemap tests with a mocked Payload Local API**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const find = vi.fn()
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }))
vi.mock('@/payload.config', () => ({ default: {} }))

import sitemap from './sitemap'

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = 'https://ks-schoerke.de/'
  })

  it('includes only canonical static paths and excludes the team redirect', async () => {
    find.mockResolvedValue({ docs: [] })

    const entries = await sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(urls).toEqual(expect.arrayContaining([
      'https://ks-schoerke.de/de',
      'https://ks-schoerke.de/en',
      'https://ks-schoerke.de/de/kontakt',
      'https://ks-schoerke.de/en/contact',
      'https://ks-schoerke.de/de/impressum',
      'https://ks-schoerke.de/en/imprint',
      'https://ks-schoerke.de/de/datenschutz',
      'https://ks-schoerke.de/en/privacy-policy',
    ]))
    expect(urls).not.toContain('https://ks-schoerke.de/de/team')
  })

  it('pairs localized published content, filters post category, and omits missing slugs', async () => {
    find.mockImplementation(({ collection, locale, where }) => {
      if (collection === 'artists') return { docs: [{ id: 1, slug: 'artist', updatedAt: '2026-09-01T00:00:00.000Z' }] }
      if (locale === 'de' && where.categories.equals === 'news') return { docs: [{ id: 2, slug: 'neu', updatedAt: '2026-09-02T00:00:00.000Z' }] }
      if (locale === 'en' && where.categories.equals === 'news') return { docs: [{ id: 2, slug: 'news', updatedAt: '2026-09-02T00:00:00.000Z' }] }
      return { docs: [] }
    })

    const entries = await sitemap()
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        url: 'https://ks-schoerke.de/de/news/neu',
        alternates: { languages: { de: 'https://ks-schoerke.de/de/news/neu', en: 'https://ks-schoerke.de/en/news/news' } },
      }),
    ]))
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'posts', depth: 0, limit: 0, locale: 'de',
      where: { _status: { equals: 'published' }, categories: { equals: 'news' } },
    }))
  })

  it('rejects invalid configured origins and propagates Payload errors', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://example.test'
    await expect(sitemap()).rejects.toThrow('NEXT_PUBLIC_SITE_URL must be an absolute HTTPS URL')

    process.env.NEXT_PUBLIC_SITE_URL = 'https://ks-schoerke.de'
    find.mockRejectedValue(new Error('Payload unavailable'))
    await expect(sitemap()).rejects.toThrow('Payload unavailable')
  })

  it('omits an invalid dynamic updatedAt value', async () => {
    find.mockResolvedValue({ docs: [{ id: 1, slug: 'artist', updatedAt: 'not-a-date' }] })

    const entries = await sitemap()
    expect(entries.find((entry) => entry.url.endsWith('/artists/artist'))).not.toHaveProperty('lastModified')
  })
})
```

- [ ] **Step 2: Run tests; confirm failure**

Run: `pnpm test src/app/sitemap.spec.ts`

Expected: FAIL. Module `./sitemap` does not exist.

### Task 4: Implement Dynamic Sitemap Route

**Files:**
- Create: `src/app/sitemap.ts`
- Test: `src/app/sitemap.spec.ts`

- [ ] **Step 1: Implement base URL, route matrix, and typed Payload query helpers**

```ts
import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/utils/siteUrl'

const LOCALES = ['de', 'en'] as const
const STATIC_PATHS = [
  '/artists', '/news', '/projects',
  '/kontakt', '/impressum', '/datenschutz',
] as const
const LOCALIZED_STATIC_PATHS = {
  de: STATIC_PATHS,
  en: ['/artists', '/news', '/projects', '/contact', '/imprint', '/privacy-policy'],
} as const

function isSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !value.includes('/')
}

function isLastModified(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}
```

- [ ] **Step 2: Implement locale-specific content query and entry generation**

```ts
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
  lastModified: string
}

async function getEntriesForLocale(locale: Locale, baseUrl: string): Promise<DynamicSitemapEntry[]> {
  const payload = await getPayload({ config })
  const [artists, news, projects] = await Promise.all([
    payload.find({ collection: 'artists', locale, depth: 0, limit: 0, select: { id: true, slug: true, updatedAt: true } }),
    payload.find({ collection: 'posts', locale, depth: 0, limit: 0, select: { id: true, slug: true, updatedAt: true }, where: { _status: { equals: 'published' }, categories: { equals: 'news' } } }),
    payload.find({ collection: 'posts', locale, depth: 0, limit: 0, select: { id: true, slug: true, updatedAt: true }, where: { _status: { equals: 'published' }, categories: { equals: 'projects' } } }),
  ])

  function mapDocuments(documents: SitemapDocument[], kind: DynamicKind): DynamicSitemapEntry[] {
    return documents.filter((doc) => isSlug(doc.slug)).map((doc) => ({
      id: doc.id,
      kind,
      locale,
      url: `${baseUrl}/${locale}/${kind}/${doc.slug}`,
      ...(isLastModified(doc.updatedAt) ? { lastModified: doc.updatedAt } : {}),
    }))
  }

  return [
    ...mapDocuments(artists.docs, 'artists'),
    ...mapDocuments(news.docs, 'news'),
    ...mapDocuments(projects.docs, 'projects'),
  ]
}
```

Then implement default route with the following logic. Add static locale entries. Fetch DE and EN dynamic entries concurrently. Group equivalent dynamic records by stable document ID and kind. For records available in both locales, set `alternates.languages` on both entries. For one-locale records, emit only that locale entry with no alternates. Set `export const revalidate = 3600` so stale output is bounded if a hook is missed; `revalidatePath('/sitemap.xml')` makes updates fresh on the next request.

```ts
export const revalidate = false

function buildStaticEntries(baseUrl: string): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) => [
    { url: `${baseUrl}/${locale}` },
    ...LOCALIZED_STATIC_PATHS[locale].map((path) => ({ url: `${baseUrl}/${locale}${path}` })),
  ])
}

function addAlternates(entries: DynamicSitemapEntry[]): MetadataRoute.Sitemap {
  const byDocument = new Map<string, Partial<Record<Locale, DynamicSitemapEntry>>>()
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.id}`
    const localized = byDocument.get(key) ?? {}
    localized[entry.locale] = entry
    byDocument.set(key, localized)
  }

  return entries.map((entry) => {
    const localized = byDocument.get(`${entry.kind}:${entry.id}`)!
    const languages = Object.fromEntries(
      LOCALES.flatMap((locale) => (localized[locale] ? [[locale, localized[locale].url]] : []))
    )
    return {
      url: entry.url,
      lastModified: entry.lastModified,
      ...(Object.keys(languages).length === 2 ? { alternates: { languages } } : {}),
    }
  })
}

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl = getSiteUrl()
  const dynamicEntries = (await Promise.all(LOCALES.map((locale) => getEntriesForLocale(locale, baseUrl)))).flat()
  return [...buildStaticEntries(baseUrl), ...addAlternates(dynamicEntries)]
}

export default sitemap
```

- [ ] **Step 3: Expand tests for timestamp, unique output, and all query contracts**

```ts
it('uses document timestamps and never emits duplicate URLs', async () => {
  find.mockImplementation(({ collection, locale, where }) => {
    if (collection === 'artists') {
      return { docs: [{ id: 1, slug: 'artist', updatedAt: '2026-09-01T00:00:00.000Z' }, { id: 2, slug: '', updatedAt: '2026-09-01T00:00:00.000Z' }] }
    }
    if (where.categories.equals === 'news') {
      return { docs: [{ id: 3, slug: locale === 'de' ? 'neu' : 'news', updatedAt: '2026-09-02T00:00:00.000Z' }] }
    }
    return { docs: [] }
  })

  const entries = await sitemap()
  const urls = entries.map((entry) => entry.url)
  const newsEntry = entries.find((entry) => entry.url.endsWith('/de/news/neu'))

  expect(new Set(urls).size).toBe(urls.length)
  expect(urls).not.toContain('https://ks-schoerke.de/de/artists/')
  expect(newsEntry?.lastModified).toBe('2026-09-02T00:00:00.000Z')
})

it('queries artists and each published category for both locales with depth zero and slim fields', async () => {
  find.mockResolvedValue({ docs: [] })

  await sitemap()

  expect(find).toHaveBeenCalledTimes(6)
  for (const call of find.mock.calls) {
    expect(call[0]).toEqual(expect.objectContaining({
      depth: 0,
      limit: 0,
      locale: expect.stringMatching(/^(de|en)$/),
      select: { id: true, slug: true, updatedAt: true },
    }))
  }
})
```

- [ ] **Step 4: Run sitemap tests; confirm pass**

Run: `pnpm test src/app/sitemap.spec.ts`

Expected: PASS.

### Task 5: Invalidate Sitemap on Artist Changes

**Files:**
- Modify: `src/collections/hooks/revalidateArtist.ts:16-20,35-61`
- Modify: `src/collections/hooks/revalidateArtist.spec.ts:34-113`

- [ ] **Step 1: Add failing cache-invalidation assertions**

```ts
it('revalidates the sitemap on change', () => {
  revalidateArtistOnChange({ doc: createMockDoc(), req: createMockReq() } as ChangeHookArgs)
  expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
})

it('revalidates the sitemap on delete', () => {
  revalidateArtistOnDelete({ doc: createMockDoc(), req: createMockReq() } as unknown as DeleteHookArgs)
  expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
})
```

- [ ] **Step 2: Run artist hook tests; confirm failure**

Run: `pnpm test src/collections/hooks/revalidateArtist.spec.ts`

Expected: FAIL. Expected `/sitemap.xml` revalidation missing.

- [ ] **Step 3: Add invalidation to the shared change/delete path**

```ts
function revalidateArtistListAndHome(): void {
  for (const path of [...ARTIST_LIST_PAGES, ...HOME_PAGES]) {
    revalidatePath(path)
  }
  revalidatePath('/sitemap.xml')
}
```

- [ ] **Step 4: Run artist hook tests; confirm pass**

Run: `pnpm test src/collections/hooks/revalidateArtist.spec.ts`

Expected: PASS.

### Task 6: Invalidate Sitemap on Published Post Changes

**Files:**
- Modify: `src/collections/hooks/revalidatePost.ts:70-95,130-157`
- Modify: `src/collections/hooks/revalidatePost.spec.ts:47-245`

- [ ] **Step 1: Add failing assertions for published lifecycle changes**

```ts
it('revalidates the sitemap when a post becomes published', async () => {
  await revalidatePostOnChange(asChangeArgs({
    doc: createMockPost({ _status: 'published' }),
    previousDoc: createMockPost({ _status: 'draft' }),
    req: createMockReq(),
  }))
  expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
})

it('revalidates the sitemap when a published post is deleted', async () => {
  await revalidatePostOnDelete(asDeleteArgs({ doc: createMockPost(), req: createMockReq() }))
  expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml')
})
```

- [ ] **Step 2: Run post hook tests; confirm failure**

Run: `pnpm test src/collections/hooks/revalidatePost.spec.ts`

Expected: FAIL. Expected `/sitemap.xml` revalidation missing.

- [ ] **Step 3: Revalidate sitemap only for a visible post lifecycle event**

```ts
// In revalidatePostOnChange, after the draft-only early return:
revalidatePath('/sitemap.xml')

// In revalidatePostOnDelete, after confirming doc._status is published:
revalidatePath('/sitemap.xml')
```

Keep the `skipRevalidation` guard before either call. Do not invalidate for a draft-to-draft autosave.

- [ ] **Step 4: Run post hook tests; confirm pass**

Run: `pnpm test src/collections/hooks/revalidatePost.spec.ts`

Expected: PASS.

### Task 7: Full Verification

**Files:**
- Verify: `src/app/robots.ts`
- Verify: `src/app/sitemap.ts`
- Verify: `src/utils/siteUrl.ts`
- Verify: `src/app/robots.spec.ts`
- Verify: `src/app/sitemap.spec.ts`
- Verify: `src/collections/hooks/revalidateArtist.ts`
- Verify: `src/collections/hooks/revalidatePost.ts`

- [ ] **Step 1: Format changed files**

Run: `pnpm exec oxfmt --write src/utils/siteUrl.ts src/utils/siteUrl.spec.ts src/app/robots.ts src/app/robots.spec.ts src/app/sitemap.ts src/app/sitemap.spec.ts src/collections/hooks/revalidateArtist.ts src/collections/hooks/revalidateArtist.spec.ts src/collections/hooks/revalidatePost.ts src/collections/hooks/revalidatePost.spec.ts`

Expected: Files formatted with no errors.

- [ ] **Step 2: Run focused tests**

Run: `pnpm test src/utils/siteUrl.spec.ts src/app/robots.spec.ts src/app/sitemap.spec.ts src/collections/hooks/revalidateArtist.spec.ts src/collections/hooks/revalidatePost.spec.ts`

Expected: PASS.

- [ ] **Step 3: Run repository checks**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm exec oxfmt --check src/utils/siteUrl.ts src/utils/siteUrl.spec.ts src/app/robots.ts src/app/robots.spec.ts src/app/sitemap.ts src/app/sitemap.spec.ts src/collections/hooks/revalidateArtist.ts src/collections/hooks/revalidateArtist.spec.ts src/collections/hooks/revalidatePost.ts src/collections/hooks/revalidatePost.spec.ts`

Expected: All commands exit 0.

- [ ] **Step 4: Request user approval before committing**

Project policy prohibits staging or committing without explicit user approval after user testing. Report changed files and verification output. Do not run `git add` or `git commit` in this plan.
