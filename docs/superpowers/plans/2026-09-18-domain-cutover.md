# Domain Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project policy override (AGENTS.md):** NEVER commit or push without explicit user approval. Every commit step below is gated on the user saying "commit". Do not run `git push` at all.

**Goal:** Serve the new Next.js site at `https://ks-schoerke.de` (apex canonical, `www` → apex, `en.ks-schoerke.de` → `/en`) without breaking storage, email, or SEO, with a fast rollback.

**Architecture:** All host + legacy redirects live in `vercel.json` (edge, before next-intl middleware) generated from `src/config/vercelRedirects.ts`. Legacy WordPress URLs are mapped by a one-off generator script (committed output). The cutover runbook is reordered so the DNS flip happens **before** the public `NEXT_PUBLIC_*` env change/redeploy, and rollback includes reverting those env vars.

**Tech Stack:** Next.js 16 (App Router), Payload CMS 3 (SQLite/Turso), next-intl, Vercel, vitest, `vercel.json` redirects (path-to-regexp v6.3), Cloudflare R2 + Vercel Blob storage.

---

## Why this plan exists (audit corrections to the spec)

The spec `docs/superpowers/specs/2026-09-15-domain-cutover-design.md` is approved, but a read-only audit found gaps. This plan encodes the fixes:

| # | Gap | Fix location |
| - | --- | ------------ |
| C1 | Spec sets `NEXT_PUBLIC_SERVER_URL=https://ks-schoerke.de` + redeploys **before** the DNS flip → reset emails/preview/Lexical images point at WordPress | Runbook Task 6: flip DNS first, set env after |
| C2 | `DOCUMENT_CLIENT_UPLOADS=true` makes browsers PUT directly to R2 → needs R2 CORS for the new origin | Runbook Task 5 (gated) |
| C3 | `permanent:true` yields **308**, not the 301 the spec verifies | Use `statusCode: 301` (omit `permanent`) throughout |
| C4 | Spec claims `www` → apex but defines no rule | `hostRedirects` in Task 1 |
| H1 | Rollback reverts DNS only, leaving apex links baked | Runbook Task 6 rollback step |
| H2 | Legacy WP URLs 404 (`/artist/:slug/`, `/kuenstler/`, `/projekte/`, flat post permalinks, `/wp-content`, `/wp-json`, `/category`, `/tag`, `/ngg_tag`, feeds) | Tasks 2–4 |
| H3 | vercel.app serves `strict-transport-security: max-age=63072000; includeSubDomains; preload`; custom-domain HSTS differs → verify/optionally override | Runbook Task 6 |
| C5 | Apex/`www`/`en` all carry `AAAA → 2001:8d8:100f:f000:0:0:0:2bb` (legacy IPv6). Spec addressed only `A`/`CNAME` — IPv6 clients would keep hitting WordPress after cutover | Runbook Phase 1 step 0 |
| M5 | `payload.config.ts:214` reads `NEXT_PUBLIC_R2_HOSTNAME`; `src/config/env.ts:14` reads `NEXT_PUBLIC_S3_HOSTNAME` | Runbook Task 5 verification |

**Verified safe (no action):** images are relative (`/api/images/file/...`, 646/646 non-absolute) so domain-independent; image uploads use Vercel Blob `clientUploads` (no CORS); document fetches are absolute on `pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev` (105/105); mail/MX/Resend/MCP/search index untouched.

**DNS correction (screenshots, 2026-09-18):** the spec's environment table says the `mail` hostname "receives no mail (MX → M365)" — that's wrong. `mail.ks-schoerke.de` has its own `MX → mx00/mx01.kundenserver.de` (IONOS webmail), plus `autodiscover.mail`, `ftp.mail`, `www.mail` records — a live, separate IONOS mailbox, untouched by this cutover regardless. Also confirmed present and out of scope: `journal` A record (`93.241.69.212`, undocumented — ask the user before WordPress retirement, not now), `_domainconnect` CNAME, `mailjet._domainkey` TXT, `send.notifications` MX/SPF (Resend's own SES bounce handling), `_sipfederationtls._tcp`/`_sip._tls` SRV and `lyncdiscover`/`sip`/`enterpriseregistration` (Skype for Business/M365, IONOS "External service" bindings not visible in the raw record list).

**Legacy inventory (fetched from `https://ks-schoerke.de/wp-sitemap.xml`, 2026-09-18):** 2214 URLs — ~2130 flat post permalinks `/{slug}/`, 24 `/artist/:slug/`, 4 `/employee/:slug/`, 8 pages (`/`, `/kuenstler/`, `/news/`, `/projekte/`, `/kontakt/`, `/impressum/`, `/datenschutz/`, `/wir-ueber-uns/`), plus `/category/*`, `/tag/*`, `/ngg_tag/*`, `/wp-sitemap*.xsl`.

**Hard platform limit:** `vercel.json` allows at most **2048** redirect entries (`packages/routing-utils/src/schemas.ts`). 2130 flat posts cannot be enumerated individually. Strategy: enumerate only legacy slugs that match real new content (bounded ≤ ~510), plus ~20 static prefix rules, plus **one** negative-lookahead catch-all for the remaining flat posts.

**Verified:** Vercel's bundled `path-to-regexp-updated@6.3.0` supports the negative-lookahead param pattern:
`match('/:slug((?!de|en|artists|…)[^/]+)')(('/de')) === null`, `match(...)('/martin-stadtfeld-spielt-x')` → `{ slug: 'martin-stadtfeld-spielt-x' }`, and `'/foo/bar'` → `null` (single-segment only).

---

## File Structure

- `src/config/vercelRedirects.ts` — **create.** Single source of truth: `hostRedirects`, `staticLegacyRedirects`, `allRedirects`, `VERCEL_REDIRECT_LIMIT`. Imports the generated content map.
- `src/config/legacyContentRedirects.json` — **create (generated).** Explicit redirects for legacy slugs still present on the new site.
- `src/config/vercelRedirects.spec.ts` — **create.** Asserts `vercel.json` is in sync, under limit, and specific contracts.
- `scripts/seo/buildLegacyRedirects.ts` — **create.** Fetches WP sitemaps, matches against Payload content, writes the JSON + a review CSV.
- `scripts/seo/buildVercelJson.ts` — **create.** Writes `vercel.json` from `vercelRedirects.ts`.
- `scripts/db/fixLegacyContentLinks.ts` — **create.** Rewrites stale legacy URLs inside post rich text (prod write, approval-gated).
- `vercel.json` — **modify.** Gains the generated `redirects` array.
- `package.json` — **modify.** Adds `seo:redirects` script.
- `docs/runbooks/domain-cutover.md` — **create.** Reordered runbook + rollback + R2 CORS + verification.

---

## Phase 1 — Host + config redirects

### Task 1: `vercel.json` host redirects + sync test

**Files:**
- Create: `src/config/vercelRedirects.ts`
- Create: `src/config/vercelRedirects.spec.ts`
- Create: `src/config/legacyContentRedirects.json` (empty array placeholder; regenerated in Task 3)
- Modify: `vercel.json`
- Create: `scripts/seo/buildVercelJson.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the empty generated map placeholder**

`src/config/legacyContentRedirects.json`:

```json
[]
```

- [ ] **Step 2: Write the failing test**

`src/config/vercelRedirects.spec.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { allRedirects, hostRedirects, staticLegacyRedirects, VERCEL_REDIRECT_LIMIT } from './vercelRedirects'

interface VercelConfig {
  redirects?: unknown[]
}

const vercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as VercelConfig

describe('vercel.json redirects', () => {
  it('is in sync with the redirect source module', () => {
    expect(vercelConfig.redirects).toEqual(allRedirects)
  })

  it('stays under the Vercel redirect limit', () => {
    expect(allRedirects.length).toBeLessThanOrEqual(VERCEL_REDIRECT_LIMIT)
  })

  it('redirects the en host root to /en without a trailing slash (single 301)', () => {
    expect(hostRedirects).toContainEqual({
      source: '/',
      has: [{ type: 'host', value: 'en.ks-schoerke.de' }],
      destination: 'https://ks-schoerke.de/en',
      statusCode: 301,
    })
  })

  it('redirects the en host paths under the /en prefix (single 301)', () => {
    expect(hostRedirects).toContainEqual({
      source: '/:path*',
      has: [{ type: 'host', value: 'en.ks-schoerke.de' }],
      destination: 'https://ks-schoerke.de/en/:path*',
      statusCode: 301,
    })
  })

  it('redirects the www host to the apex (single 301)', () => {
    expect(hostRedirects).toContainEqual({
      source: '/:path*',
      has: [{ type: 'host', value: 'www.ks-schoerke.de' }],
      destination: 'https://ks-schoerke.de/:path*',
      statusCode: 301,
    })
  })

  it('never uses permanent:true (which emits 308, not 301)', () => {
    for (const redirect of allRedirects) {
      expect(redirect.statusCode).toBe(301)
      expect(redirect.permanent).toBeUndefined()
    }
  })

  it('places the single-segment legacy catch-all last, before its trailing-slash twin', () => {
    const catchAllIndex = staticLegacyRedirects.findIndex((redirect) => redirect.source.includes('(?!de|en'))
    expect(catchAllIndex).toBe(staticLegacyRedirects.length - 2)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run src/config/vercelRedirects.spec.ts`
Expected: FAIL — `Cannot find module './vercelRedirects'` (and `../../vercel.json` has no `redirects`).

- [ ] **Step 4: Implement the redirect source module**

`src/config/vercelRedirects.ts`:

```typescript
import legacyContentRedirects from './legacyContentRedirects.json'

export interface VercelRedirect {
  source: string
  destination: string
  statusCode?: number
  permanent?: boolean
  has?: { type: 'host'; value: string }[]
}

export const VERCEL_REDIRECT_LIMIT = 2048

export const hostRedirects: VercelRedirect[] = [
  {
    source: '/',
    has: [{ type: 'host', value: 'en.ks-schoerke.de' }],
    destination: 'https://ks-schoerke.de/en',
    statusCode: 301,
  },
  {
    source: '/:path*',
    has: [{ type: 'host', value: 'en.ks-schoerke.de' }],
    destination: 'https://ks-schoerke.de/en/:path*',
    statusCode: 301,
  },
  {
    source: '/:path*',
    has: [{ type: 'host', value: 'www.ks-schoerke.de' }],
    destination: 'https://ks-schoerke.de/:path*',
    statusCode: 301,
  },
]

const LEGACY_SLUG = '((?!de|en|api|admin|_next|preview|artists|news|projects|team|kontakt|contact|impressum|imprint|datenschutz|privacy-policy|favicon\\.ico|robots\\.txt|sitemap\\.xml)[^/]+)'

export const staticLegacyRedirects: VercelRedirect[] = [
  { source: '/kuenstler', destination: '/de/artists', statusCode: 301 },
  { source: '/kuenstler/', destination: '/de/artists', statusCode: 301 },
  { source: '/artist/:slug', destination: '/de/artists/:slug', statusCode: 301 },
  { source: '/artist/:slug/', destination: '/de/artists/:slug', statusCode: 301 },
  { source: '/employee/:slug', destination: '/de/team', statusCode: 301 },
  { source: '/employee/:slug/', destination: '/de/team', statusCode: 301 },
  { source: '/news', destination: '/de/news', statusCode: 301 },
  { source: '/news/', destination: '/de/news', statusCode: 301 },
  { source: '/projekte', destination: '/de/projects', statusCode: 301 },
  { source: '/projekte/', destination: '/de/projects', statusCode: 301 },
  { source: '/projekte/:slug', destination: '/de/projects/:slug', statusCode: 301 },
  { source: '/projekte/:slug/', destination: '/de/projects/:slug', statusCode: 301 },
  { source: '/kontakt', destination: '/de/kontakt', statusCode: 301 },
  { source: '/kontakt/', destination: '/de/kontakt', statusCode: 301 },
  { source: '/impressum', destination: '/de/impressum', statusCode: 301 },
  { source: '/impressum/', destination: '/de/impressum', statusCode: 301 },
  { source: '/datenschutz', destination: '/de/datenschutz', statusCode: 301 },
  { source: '/datenschutz/', destination: '/de/datenschutz', statusCode: 301 },
  { source: '/wir-ueber-uns', destination: '/de/team', statusCode: 301 },
  { source: '/wir-ueber-uns/', destination: '/de/team', statusCode: 301 },
  { source: '/category/kuenstler/:slug', destination: '/de/artists/:slug', statusCode: 301 },
  { source: '/category/kuenstler/:slug/', destination: '/de/artists/:slug', statusCode: 301 },
  { source: '/category/:path*', destination: '/de/news', statusCode: 301 },
  { source: '/tag/:path*', destination: '/de/news', statusCode: 301 },
  { source: '/ngg_tag/:path*', destination: '/de/news', statusCode: 301 },
  { source: '/wp-content/:path*', destination: '/de', statusCode: 301 },
  { source: '/wp-json/:path*', destination: '/de', statusCode: 301 },
  { source: '/wp-admin/:path*', destination: '/de', statusCode: 301 },
  { source: '/wp-sitemap:path*', destination: '/de', statusCode: 301 },
  { source: '/feed/:path*', destination: '/de/news', statusCode: 301 },
  { source: `/:slug${LEGACY_SLUG}`, destination: '/de/news', statusCode: 301 },
  { source: `/:slug${LEGACY_SLUG}/`, destination: '/de/news', statusCode: 301 },
]

export const allRedirects: VercelRedirect[] = [
  ...hostRedirects,
  ...staticLegacyRedirects,
  ...(legacyContentRedirects as VercelRedirect[]),
]
```

- [ ] **Step 5: Write the vercel.json generator**

`scripts/seo/buildVercelJson.ts`:

```typescript
/**
 * Writes vercel.json from src/config/vercelRedirects.ts.
 *
 * Usage: pnpm seo:vercel
 *
 * Run after editing src/config/vercelRedirects.ts or regenerating
 * src/config/legacyContentRedirects.json (pnpm seo:redirects).
 *
 * @see scripts/seo/buildLegacyRedirects.ts
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { allRedirects, VERCEL_REDIRECT_LIMIT } from '../../src/config/vercelRedirects'

const BASE_CONFIG = {
  buildCommand: 'pnpm run build:ci',
  git: {
    deploymentEnabled: {
      'dependabot/**': false,
    },
  },
}

async function main(): Promise<void> {
  if (allRedirects.length > VERCEL_REDIRECT_LIMIT) {
    throw new Error(`Too many redirects: ${allRedirects.length} exceeds ${VERCEL_REDIRECT_LIMIT}`)
  }

  const config = { ...BASE_CONFIG, redirects: allRedirects }
  await writeFile(join(process.cwd(), 'vercel.json'), `${JSON.stringify(config, null, 2)}\n`)
  console.log(`Wrote vercel.json with ${allRedirects.length} redirects`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

- [ ] **Step 6: Add the package script**

In `package.json` `"scripts"`, add after `"scan:secrets"`:

```json
    "seo:redirects": "tsx scripts/seo/buildLegacyRedirects.ts",
    "seo:vercel": "tsx scripts/seo/buildVercelJson.ts"
```

(Ensure the preceding line gets a trailing comma.)

- [ ] **Step 7: Generate vercel.json**

Run: `pnpm seo:vercel`
Expected: `Wrote vercel.json with 35 redirects` (3 host + 32 static; the JSON placeholder is empty).

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm vitest run src/config/vercelRedirects.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 9: Guard the catch-all regex against Vercel's parser**

Run:
```bash
node -e "const p=require('/opt/homebrew/Cellar/vercel/59.20.0/libexec/lib/node_modules/vercel/node_modules/path-to-regexp-updated'); const src=require('./src/config/vercelRedirects.ts'); console.log('ok')"
```
If the brew path is unavailable, instead run `pnpm seo:vercel` then `pnpm exec vercel build --yes` in a clean checkout and confirm it does not error on the redirect patterns. Expected: no `PathError` / `Failed to parse redirect`.

- [ ] **Step 10: Commit (user-gated)**

Per AGENTS.md, do NOT commit until the user approves. When approved:

```bash
git add src/config/vercelRedirects.ts src/config/vercelRedirects.spec.ts src/config/legacyContentRedirects.json scripts/seo/buildVercelJson.ts vercel.json package.json
git commit -m "feat(seo): add host redirects and vercel.json generator for domain cutover"
```

---

## Phase 2 — Legacy URL redirect map

### Task 2: Legacy content redirect generator

**Files:**
- Create: `scripts/seo/buildLegacyRedirects.ts`
- Modify: `src/config/legacyContentRedirects.json` (generated output)
- Generated artifact: `data/dumps/legacy-redirect-review.csv`

- [ ] **Step 1: Write the generator**

`scripts/seo/buildLegacyRedirects.ts`:

```typescript
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
    for (const loc of await fetchLocs(sitemap)) {
      paths.add(normalise(new URL(loc).pathname))
    }
  }
  return [...paths]
}

async function getNewSlugs(): Promise<{ artists: Set<string>; news: Set<string>; projects: Set<string> }> {
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

  return { artists: slugs(artists.docs), news: slugs(news.docs), projects: slugs(projects.docs) }
}

type Slugs = Awaited<ReturnType<typeof getNewSlugs>>

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
  if (first === 'news') return second ? slugDestination(second, slugs) ?? '/de/news' : '/de/news'
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
  await writeFile(
    CSV_OUT,
    ['source,destination,matched', ...review.map((row) => `${row.source},${row.destination},${row.matched}`)].join('\n') + '\n'
  )

  console.log(`Matched legacy content: ${redirects.length} redirects -> ${JSON_OUT}`)
  console.log(`Review CSV: ${review.length} rows -> ${CSV_OUT}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

- [ ] **Step 2: Run the generator against local `dev.db`**

Run:
```bash
DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm seo:redirects
```
Expected: prints a matched count and row count; `src/config/legacyContentRedirects.json` contains only `/de/(news|projects|artists)/<slug>` destinations; `data/dumps/legacy-redirect-review.csv` lists every legacy URL.

- [ ] **Step 3: Sanity-check the output**

Run:
```bash
node -e "const r=require('./src/config/legacyContentRedirects.json'); console.log('count',r.length); const bad=r.filter(x=>!/^\/de\/(news|projects|artists)\/[^/]+$/.test(x.destination)); console.log('bad',bad.length)"
```
Expected: `count` > 0 (roughly ≤ 510), `bad 0`.

- [ ] **Step 4: Regenerate `vercel.json` and re-run the test**

Run: `pnpm seo:vercel && pnpm vitest run src/config/vercelRedirects.spec.ts`
Expected: `Wrote vercel.json with N redirects` where N ≤ 2048, then PASS.

- [ ] **Step 5: Commit (user-gated)**

```bash
git add scripts/seo/buildLegacyRedirects.ts src/config/legacyContentRedirects.json vercel.json
git commit -m "feat(seo): generate legacy WordPress content redirects"
```

---

### Task 3: Legacy redirect strategy review (user decision)

**Files:**
- Read: `data/dumps/legacy-redirect-review.csv`
- Modify (if the user chooses): `src/config/vercelRedirects.ts` (catch-all destination)

- [ ] **Step 1: Summarise the unmatched legacy URLs for the user**

Run:
```bash
awk -F, '$3=="no"' data/dumps/legacy-redirect-review.csv | wc -l
awk -F, '$3=="no"{print $2}' data/dumps/legacy-redirect-review.csv | sort | uniq -c | sort -rn
```
Expected: ~1600–2100 unmatched, nearly all destined for `/de/news`.

- [ ] **Step 2: Ask the user to confirm the catch-all destination**

Prompt: "Unmatched legacy URLs (old event/venue posts) will 301 to `/de/news`. Keep `/de/news`, or send them to the homepage `/de`?" STOP and wait for the answer.

- [ ] **Step 3: If the user picks the homepage**

In `src/config/vercelRedirects.ts`, change both catch-all `destination` values from `'/de/news'` to `'/de'`, then run:
```bash
pnpm seo:vercel && pnpm vitest run src/config/vercelRedirects.spec.ts
```
Expected: regenerate prints the redirect count, tests PASS.

- [ ] **Step 4: Commit (user-gated)**

```bash
git add src/config/vercelRedirects.ts vercel.json
git commit -m "chore(seo): set legacy catch-all destination"
```

---

### Task 4: Fix stale legacy links inside post rich text

The audit found real in-content links that will 404 after cutover: post **258** (`https://ks-schoerke.de/artist/jean-paul-gasparian/` in `de`, `https://en.ks-schoerke.de/artist/jean-paul-gasparian/` in `en`) and post **47** (`https://schoerke-website.vercel.app/de/news`).

**Files:**
- Create: `scripts/db/fixLegacyContentLinks.ts`

> **DB POLICY (AGENTS.md):** The prod run in Step 4 requires explicit user approval. Do not run it until the user says "proceed". Steps 1–3 are local-only.

- [ ] **Step 1: Write the fixer**

`scripts/db/fixLegacyContentLinks.ts`:

```typescript
/**
 * Rewrites stale legacy hostnames inside post rich-text content.
 *
 * Replacements:
 *   https://ks-schoerke.de/artist/<slug>/      -> /de/artists/<slug>
 *   https://en.ks-schoerke.de/artist/<slug>/   -> /en/artists/<slug>
 *   https://schoerke-website.vercel.app/<path> -> https://ks-schoerke.de/<path>
 *
 * Usage (local dev.db):
 *   DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm tsx scripts/db/fixLegacyContentLinks.ts
 *
 * Usage (production, WRITE — requires user approval):
 *   TOKEN=$(grep '^DATABASE_AUTH_TOKEN=' .env | cut -d= -f2)
 *   DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" \
 *     DATABASE_AUTH_TOKEN="$TOKEN" NODE_ENV=production pnpm tsx scripts/db/fixLegacyContentLinks.ts
 *
 * Idempotent: re-running after a successful pass changes nothing.
 */
import 'dotenv/config'

import config from '@/payload.config'
import { getPayload } from 'payload'

interface LegacyLinkHit {
  id: number
  locale: 'de' | 'en'
}

function rewriteContent(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/https:\/\/ks-schoerke\.de\/artist\//g, '/de/artists/')
      .replace(/https:\/\/en\.ks-schoerke\.de\/artist\//g, '/en/artists/')
      .replace(/https:\/\/schoerke-website\.vercel\.app\//g, 'https://ks-schoerke.de/')
  }
  if (Array.isArray(value)) return value.map(rewriteContent)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewriteContent(entry)]))
  }
  return value
}

async function main(): Promise<void> {
  const payload = await getPayload({ config })
  const hits = (await payload.find({
    collection: 'posts',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: {
      or: [
        { content: { like: 'ks-schoerke.de/artist/' } },
        { content: { like: 'en.ks-schoerke.de/artist/' } },
        { content: { like: 'schoerke-website.vercel.app' } },
      ],
    },
    select: { id: true },
  })) as { docs: { id: number }[] }

  console.log(`Candidate posts: ${hits.docs.length}`)

  for (const post of hits.docs) {
    for (const locale of ['de', 'en'] as const) {
      const doc = (await payload.findByID({
        collection: 'posts',
        id: post.id,
        locale,
        depth: 0,
        overrideAccess: true,
      })) as unknown as LegacyLinkHit & { content?: unknown; slug?: string }

      const before = JSON.stringify(doc.content ?? null)
      const after = JSON.stringify(rewriteContent(doc.content ?? null))
      if (before === after) continue

      await payload.update({
        collection: 'posts',
        id: post.id,
        locale,
        data: { content: rewriteContent(doc.content) as never },
        context: { skipRevalidation: true },
        overrideAccess: true,
      })
      console.log(`Updated post ${post.id} (${locale})${doc.slug ? ` slug=${doc.slug}` : ''}`)
    }
  }

  console.log('Done')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

- [ ] **Step 2: Dry-run against local `dev.db` and inspect the diff**

Run:
```bash
DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm tsx scripts/db/fixLegacyContentLinks.ts
```
Expected: lists candidate posts and updates them; re-running prints `Candidate posts: 0`.

- [ ] **Step 3: Verify no stale links remain locally**

Run:
```bash
sqlite3 dev.db "SELECT COUNT(*) FROM posts_locales WHERE content LIKE '%ks-schoerke.de/artist/%' OR content LIKE '%vercel.app%';"
```
Expected: `0`.

- [ ] **Step 4: STOP — ask the user for approval before the production run**

Present exactly: the script path, the target DB (`ksschoerke-production`), that it rewrites `content` on up to N posts in both locales, and that it is idempotent. Wait for "proceed". Then run:
```bash
TOKEN=$(grep '^DATABASE_AUTH_TOKEN=' .env | cut -d= -f2)
DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" \
  DATABASE_AUTH_TOKEN="$TOKEN" NODE_ENV=production pnpm tsx scripts/db/fixLegacyContentLinks.ts
```
Expected: candidate posts updated; second run reports 0 candidates.

- [ ] **Step 5: Commit (user-gated)**

```bash
git add scripts/db/fixLegacyContentLinks.ts
git commit -m "fix(posts): rewrite legacy artist links in rich text"
```

---

## Phase 3 — Operational runbook

### Task 5: R2 CORS + storage verification (gated)

**Files:**
- Create: `docs/runbooks/domain-cutover.md` (sections added here; full doc completed in Task 6)

- [ ] **Step 1: Determine whether direct-to-R2 document uploads are enabled in production**

Run: `vercel env ls production`
Expected: look for `DOCUMENT_CLIENT_UPLOADS`. Record present/absent and value.

- [ ] **Step 2: Read the current R2 bucket CORS policy (read-only)**

Run:
```bash
aws s3api get-bucket-cors --bucket "$CLOUDFLARE_S3_BUCKET" --endpoint-url "$CLOUDFLARE_S3_API_ENDPOINT"
```
Expected: current `AllowedOrigins` list. If `DOCUMENT_CLIENT_UPLOADS` is not `true`, no change is needed — stop here.

- [ ] **Step 3: If (and only if) uploads are enabled, update CORS to include the new origins**

Required origins: `https://ks-schoerke.de`, `https://www.ks-schoerke.de`, `https://en.ks-schoerke.de`, `https://schoerke-website.vercel.app`, `http://localhost:3000`. Required headers: `content-type`, `content-length`, `if-none-match`.

This is a Cloudflare/credential-affecting change. STOP and get explicit user approval, then apply via Cloudflare dashboard → R2 → bucket `schoerke-website` → Settings → CORS Policy, or:
```bash
aws s3api put-bucket-cors --bucket "$CLOUDFLARE_S3_BUCKET" --endpoint-url "$CLOUDFLARE_S3_API_ENDPOINT" --cors-configuration file:///tmp/r2-cors.json
```
with `/tmp/r2-cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://ks-schoerke.de",
        "https://www.ks-schoerke.de",
        "https://en.ks-schoerke.de",
        "https://schoerke-website.vercel.app",
        "http://localhost:3000"
      ],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["content-type", "content-length", "if-none-match"],
      "ExposeHeaders": ["etag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

- [ ] **Step 4: Verify the remaining storage env vars**

Run: `vercel env ls production`
Expected: `NEXT_PUBLIC_R2_HOSTNAME` present (documents, `payload.config.ts:214`), `BLOB_READ_WRITE_TOKEN` present (images), `NEXT_PUBLIC_S3_HOSTNAME` present if `src/config/env.ts:14` consumers are used. If any is missing, STOP and ask the user for the value — do not generate credentials.

- [ ] **Step 5: Append findings to the runbook**

Add an "R2 / storage" section to `docs/runbooks/domain-cutover.md` recording: `DOCUMENT_CLIENT_UPLOADS` value, before/after CORS origins, and env var presence. Commit (user-gated):
```bash
git add docs/runbooks/domain-cutover.md
git commit -m "docs: record R2 CORS and storage preconditions for cutover"
```

---

### Task 6: Cutover + rollback runbook

**Files:**
- Create: `docs/runbooks/domain-cutover.md`

- [ ] **Step 1: Write the runbook**

`docs/runbooks/domain-cutover.md`:

````markdown
# Domain Cutover Runbook — ks-schoerke.de → Vercel

Companion to `docs/superpowers/specs/2026-09-15-domain-cutover-design.md`.
Corrections vs. the spec: DNS flip happens BEFORE the env change (C1); explicit 301s (C3/C4);
rollback reverts env (H1); legacy redirects are deployed first (H2).

## Safety rails

- Touch ONLY apex `A`/`AAAA`, `www` `A`/`AAAA`/`CNAME`, `en` `A`/`AAAA`/`CNAME` at IONOS. NEVER edit MX/SPF/DKIM/`MS=`.
- **Never touch** (confirmed present, out of scope): `mail.*` (own `MX → kundenserver.de`, `autodiscover.mail`, `ftp.mail`, `www.mail` — a live separate IONOS mailbox), `ftp`, `journal` (undocumented — ask before WordPress retirement), `_domainconnect`, `mailjet._domainkey`, `notifications`/`send.notifications` (Resend + its SES bounce handling), `autodiscover`, `enterpriseenrollment`, `enterpriseregistration`, `lyncdiscover`, `sip`, `_sipfederationtls._tcp`, `_sip._tls`.
- Do not add CAA records. Do not move nameservers.
- IONOS: delete the old `A`/`AAAA` before adding the `CNAME` (conflict error otherwise).

## Phase 0 — Pre-flight (no user-visible risk)

1. `pnpm seo:vercel && pnpm vitest run src/config/vercelRedirects.spec.ts` — redirects green.
2. Legacy content links fixed (plan Task 4) and `vercel.json` legacy redirects committed + deployed to production.
3. Add all three domains in the Vercel project: `ks-schoerke.de`, `www.ks-schoerke.de`, `en.ks-schoerke.de`.
4. Copy the dashboard card values (apex `A`, `www`/`en` `CNAME`, `_vercel` TXT per domain). Do not use memorized IPs.
5. Add `_vercel.<domain>` TXT records at IONOS; confirm each domain shows Verified in Vercel.
6. Set `ks-schoerke.de` as the Production Domain.
7. Confirm Deployment Protection is OFF for Production (public site must not gate behind SSO).
8. R2 CORS done (plan Task 5) if `DOCUMENT_CLIENT_UPLOADS=true`.
9. **Check whether Vercel publishes an AAAA/IPv6 value for the apex domain card.** If yes, note it for step 11. If no (common on custom domains today), plan to delete the apex/`www`/`en` `AAAA` records at cutover — IPv6 clients fall back to IPv4 (Happy Eyeballs); leaving the old `AAAA` in place would silently keep serving WordPress to IPv6 clients.
10. Export the IONOS DNS zone (captures current `AAAA` values for rollback). Lower apex `A`/`AAAA` and `www` TTL to 300s; wait ≥ the previous TTL (often 24h).
11. Probe the Vercel edge before the flip (replace `<card-ip>`):
    ```bash
    curl -I --resolve ks-schoerke.de:443:<card-ip> https://ks-schoerke.de/
    curl -I --resolve www.ks-schoerke.de:443:<card-ip> https://www.ks-schoerke.de/
    curl -I --resolve en.ks-schoerke.de:443:<card-ip> https://en.ks-schoerke.de/artists
    ```
    Expected: apex 3xx → `/de`; www single 301 → apex; en single 301 → `https://ks-schoerke.de/en/artists`. If en double-hops, fix redirects before flipping.

## Phase 1 — Cutover (low-traffic German evening)

0. Delete the legacy `AAAA` records on apex, `www`, and `en` (or replace with Vercel's card AAAA value if one exists — step 9 of Phase 0). Do this together with step 1.
1. Flip apex `A` → card value AND `www` (delete `A`, add `CNAME` → card value) TOGETHER.
2. Wait for Vercel domains to show Valid; Let's Encrypt issues once DNS points at Vercel (allow minutes).
3. Flip `en`: delete `A`, add `CNAME` → card value.
4. Verify certificates + redirects:
    ```bash
    curl -I https://ks-schoerke.de/                       # 3xx -> /de then 200
    curl -I https://www.ks-schoerke.de/                   # single 301 -> https://ks-schoerke.de/
    curl -I https://en.ks-schoerke.de/artists             # single 301 -> https://ks-schoerke.de/en/artists
    curl -I https://en.ks-schoerke.de/?a=1                # query preserved, no loop
    dig +short AAAA ks-schoerke.de                        # empty, or Vercel's published value — never the old 2001:8d8:... 
    ```

## Phase 2 — Set public env, then redeploy (C1)

Only AFTER DNS + certs are confirmed:

1. Vercel → Settings → Environment Variables.
   - Production: `NEXT_PUBLIC_SERVER_URL=https://ks-schoerke.de` and `NEXT_PUBLIC_SITE_URL=https://ks-schoerke.de`.
   - Preview: `NEXT_PUBLIC_SERVER_URL=https://schoerke-website.vercel.app` and `NEXT_PUBLIC_SITE_URL=https://schoerke-website.vercel.app`.
2. Redeploy production (`NEXT_PUBLIC_*` values are baked at build time).
3. Verify:
   - Password reset email: request one, confirm the button + logo resolve on `https://ks-schoerke.de/...`, then complete a reset.
   - Payload live preview from the apex admin.
   - `/en`, `sitemap.xml`, `robots.txt`, admin login, an image, and a document download.

## Phase 3 — Verification

```bash
dig +short A ks-schoerke.de
dig +short CNAME www.ks-schoerke.de
dig +short CNAME en.ks-schoerke.de
dig +short MX ks-schoerke.de
dig +short TXT ks-schoerke.de
dig +short TXT notifications.ks-schoerke.de
dig +short TXT resend._domainkey.notifications.ks-schoerke.de
curl -sI https://ks-schoerke.de/ | grep -i strict-transport-security
```
Expected: apex = card IP; `www`/`en` = card CNAME; MX/SPF/`MS=`/Resend intact; HSTS header noted (see below).

Mail: inbound test to `info@ks-schoerke.de`; outbound Resend test (password reset) to an external inbox.
Search Console: add `ks-schoerke.de`, submit `sitemap.xml`.

## HSTS (H3)

The `vercel.app` host returns `strict-transport-security: max-age=63072000; includeSubDomains; preload`.
Custom domains get Vercel-managed HSTS scoped per-subdomain. Browsers cache this for 2 years.
If a conservative value is preferred before cutover, override via `vercel.json`:
```json
{
  "headers": [
    { "source": "/(.*)", "headers": [{ "key": "Strict-Transport-Security", "value": "max-age=31536000" }] }
  ]
}
```
Do NOT submit to the preload list. Restoring to HTTP-only WordPress after an HSTS cache is set will cause browser errors — another reason rollback must be quick.

## Rollback

Expected 10–30 minutes (TTL is a floor; resolver/browser caches linger). WordPress stays live during propagation, so this is an inconsistency window, not a hard outage.

1. Restore apex `A` → `217.160.0.184` and `AAAA` → `2001:8d8:100f:f000:0:0:0:2bb`.
2. Restore `www` → `217.160.0.184` / `AAAA` → `2001:8d8:100f:f000:0:0:0:2bb` (and re-enable the IONOS redirect if it was removed).
3. Revert `en` (`A`/`AAAA`) if it was flipped.
4. **Revert env (H1):** set Production `NEXT_PUBLIC_SERVER_URL` and `NEXT_PUBLIC_SITE_URL` back to `https://schoerke-website.vercel.app`, then redeploy. Without this, reset/preview links keep pointing at the old apex.
5. Vercel domains/certs can be left in place (harmless).

Triggers: TLS errors > 15 min; deployment 5xx on an equivalent route; a domain card stuck Invalid.

## Post-cutover follow-ups

- Keep WordPress live 1–2 weeks, then retire hosting (watch IONOS auto-DNS bindings when deleting).
- **Do not delete `mail`/`ftp` blindly** — `mail.ks-schoerke.de` is a live separate IONOS mailbox (its own MX to `kundenserver.de`, confirmed via IONOS dashboard 2026-09-18), not dead weight. Confirm with the user whether it's still in use before touching it at retirement.
- Ask the user what the undocumented `journal` A record (`93.241.69.212`) is before retiring anything on that IP.
- Consider DMARC (`p=none`) and CAA (`letsencrypt.org`, `pki.goog`) as separate tasks.
- Consolidate `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SERVER_URL` (smell).
````

- [ ] **Step 2: Cross-check the runbook against the spec**

Confirm every spec §5 phase item appears in the runbook, and every audit fix (C1–C4, H1–H3) has a matching step. Add any missing line inline.

- [ ] **Step 3: Commit (user-gated)**

```bash
git add docs/runbooks/domain-cutover.md
git commit -m "docs: add domain cutover and rollback runbook"
```

---

## Final verification

- [ ] `pnpm vitest run src/config/vercelRedirects.spec.ts` — PASS.
- [ ] `pnpm lint` — no new errors.
- [ ] `pnpm typecheck` — no new errors (note: `scripts/seo/**` is typechecked; `scripts/db/**` is excluded by `tsconfig.json:28`).
- [ ] `pnpm build` — production build succeeds with the new `vercel.json` redirects.
- [ ] Pre-cutover probe (runbook Phase 0 step 10) returns single 301s for `www` and `en`.

## Self-review notes

- **Spec coverage:** spec §5 Phase 0 → runbook Phase 0; §5 Phase 1 → runbook Phase 1; §5 Phase 2 → runbook Phase 2/3; §6 en redirect → Task 1 host redirects; §7 legacy → Tasks 2–4; §8 rollback → runbook; §9 risks → audit table; §11 commands → runbook.
- **Deliberate deviation:** DNS flip precedes the env change (C1), reversing spec §5 Phase 0 step 5.
- **Known trade-off:** unmatched legacy flat posts 301 to `/de/news` (or `/de`). This avoids 404s but may mask genuinely broken new links; the smoke-test checklist covers the canonical routes.
- **Open item:** confirm `_vercel` TXT tokens and card IP/CNAME values from the Vercel dashboard during execution — never from memory.
