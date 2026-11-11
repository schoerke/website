import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import legacyContentRedirects from './legacyContentRedirects.json'
import {
  allRedirects,
  catchAllRedirects,
  hostRedirects,
  RESERVED_SEGMENTS,
  VERCEL_REDIRECT_LIMIT,
} from './vercelRedirects'

interface VercelConfig {
  redirects?: unknown[]
}

const vercelConfig = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as VercelConfig

const ROUTE_ROOTS = ['src/app/(frontend)', 'src/app/(frontend)/[locale]', 'src/app/(payload)', 'src/app/api']

// Reserved names with no route directory of their own: locale prefixes handled by next-intl,
// framework internals, and well-known static files served by src/app/{robots,sitemap}.ts.
const NON_ROUTE_SEGMENTS: readonly string[] = ['de', 'en', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml']

function listDirectoryNames(relativeDir: string): string[] {
  return readdirSync(join(process.cwd(), relativeDir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function collectRouteSegments(): string[] {
  const segments = ROUTE_ROOTS.flatMap(listDirectoryNames)
  return [...new Set(segments)].filter((name) => !name.startsWith('_') && name !== '[locale]')
}

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

  it('places the single-segment catch-all last in allRedirects, after every legacy-content redirect', () => {
    // Regression test for a real bug caught in review: the catch-all previously lived inside
    // staticLegacyRedirects, which is spread in BEFORE legacyContentRedirects, silently shadowing
    // all 322 specific legacy-content redirects (Vercel matches redirects top-to-bottom, first
    // match wins). This asserts position in the FINAL array, not just within staticLegacyRedirects.
    const lastTwo = allRedirects.slice(-2)
    expect(lastTwo).toEqual(catchAllRedirects)

    for (const redirect of legacyContentRedirects) {
      const indexInAll = allRedirects.findIndex((r) => r.source === redirect.source)
      expect(indexInAll).toBeLessThan(allRedirects.length - catchAllRedirects.length)
    }
  })

  it('reserved segments list matches the real top-level route tree under src/app/(frontend)', () => {
    // Cross-check against the actual filesystem so a new top-level page can't silently start
    // getting shadowed by the legacy catch-all just because nobody remembered to update this list.
    const frontendDir = join(process.cwd(), 'src/app/(frontend)')
    const topLevelSegments = readdirSync(frontendDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== '[locale]')
      .map((entry) => entry.name)

    for (const segment of topLevelSegments) {
      expect(RESERVED_SEGMENTS).toContain(segment)
    }
  })

  it('every reserved segment still maps to a real route directory', () => {
    // Reverse of the test above: a deleted route must not leave its segment reserved forever,
    // or a legacy WordPress post with that slug would silently 404 instead of redirecting.
    // Prototype dirs are temporary, so this catches them being removed without the list entry.
    const routeSegments = collectRouteSegments()

    const staleSegments = RESERVED_SEGMENTS.filter(
      (segment) => !NON_ROUTE_SEGMENTS.includes(segment) && !routeSegments.includes(segment)
    )

    expect(staleSegments, `stale RESERVED_SEGMENTS entries (no matching route dir): ${staleSegments}`).toEqual([])
  })

  describe('legacy catch-all regex behavior', () => {
    const catchAllPattern = catchAllRedirects[0].source.replace(/^\/:slug/, '')
    const regex = new RegExp(`^${catchAllPattern}$`)

    it('excludes every reserved segment (would otherwise 301 real app routes to /de/news)', () => {
      for (const segment of RESERVED_SEGMENTS) {
        expect(regex.test(segment)).toBe(false)
      }
    })

    it('matches ordinary legacy post slugs', () => {
      expect(regex.test('martin-stadtfeld-spielt-in-shanghai')).toBe(true)
      expect(regex.test('4-haendig-mit-lilian-akopova')).toBe(true)
    })

    it('does not exclude segments that merely start with a reserved word (regression: delmenhorst-* etc)', () => {
      // Real legacy WordPress slugs that start with a reserved word but aren't the reserved word
      // itself. Without the `$` anchor in LEGACY_SLUG, these were wrongly excluded from the
      // catch-all — 404ing instead of redirecting to /de/news.
      expect(regex.test('newsletter')).toBe(true)
      expect(regex.test('apiary')).toBe(true)
      expect(regex.test('delmenhorst-kleines-haus')).toBe(true)
      expect(regex.test('den-haag-zuiderstrandtheater-2')).toBe(true)
      expect(regex.test('engers-schloss')).toBe(true)
      expect(regex.test('enschede-muziekcentrum')).toBe(true)
    })
  })
})
