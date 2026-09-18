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

// Every top-level segment that must NEVER be swallowed by the legacy catch-all:
// locale prefixes, framework internals, canonical un-prefixed routes that
// next-intl middleware redirects to /de/*, well-known static files, and every
// current top-level page under src/app/(frontend)/** (including empty
// prototype scaffolding dirs, in case a page.tsx is added to them later).
// If a new top-level page is added under src/app/(frontend)/, its segment
// MUST be added here too, or this catch-all will silently shadow it forever —
// vercelRedirects.spec.ts cross-checks this list against the real route tree.
export const RESERVED_SEGMENTS = [
  'de',
  'en',
  'api',
  'admin',
  '_next',
  'preview',
  'artists',
  'news',
  'projects',
  'team',
  'kontakt',
  'contact',
  'impressum',
  'imprint',
  'datenschutz',
  'privacy-policy',
  'brand',
  'artist-links-prototype',
  'featured-quote-font-prototype',
  'performers-list-prototype',
  'performers-list-converter-prototype',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
] as const

// Single-segment legacy WordPress post slug, excluding every RESERVED_SEGMENTS entry.
// The `$` anchor after the alternation is required: without it, the lookahead rejects any
// segment that merely STARTS WITH a reserved word (e.g. "delmenhorst-kleines-haus" starts with
// "de" and would be wrongly excluded, 404ing instead of redirecting) rather than only segments
// that exactly equal one. Verified against 6 real legacy slugs that would otherwise be silently
// unreachable (delmenhorst-*, den-haag-*, engers-schloss, enschede-*).
const LEGACY_SLUG = `((?!(?:${RESERVED_SEGMENTS.map((segment) => segment.replace('.', '\\.')).join('|')})$)[^/]+)`

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
  { source: '/wp-sitemap:rest([^/]*)', destination: '/de', statusCode: 301 },
  { source: '/feed/:path*', destination: '/de/news', statusCode: 301 },
]

// MUST stay last in allRedirects, after every specific rule (including
// legacyContentRedirects) — this is a catch-all for any remaining single-segment
// legacy slug and would otherwise shadow more specific redirects that appear
// after it in evaluation order (Vercel matches redirects top-to-bottom, first
// match wins).
export const catchAllRedirects: VercelRedirect[] = [
  { source: `/:slug${LEGACY_SLUG}`, destination: '/de/news', statusCode: 301 },
  { source: `/:slug${LEGACY_SLUG}/`, destination: '/de/news', statusCode: 301 },
]

export const allRedirects: VercelRedirect[] = [
  ...hostRedirects,
  ...staticLegacyRedirects,
  ...(legacyContentRedirects as VercelRedirect[]),
  ...catchAllRedirects,
]
