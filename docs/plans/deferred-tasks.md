# Deferred Tasks

Tasks that were intentionally deferred during implementation. Tracked here to avoid losing them.

---

## Search (from `2025-11-24-project-wide-search-refined-design.md`)

These items are Phase 6 polish, not yet implemented:

- **Dedicated search page** `/[locale]/search` — large input, URL param `?q=`, grouped results, skeleton loaders, empty
  states. Files: `src/app/(frontend)/[locale]/search/page.tsx`, `src/components/Search/SearchPage.tsx`, etc.
- **Header search trigger** — magnifying glass icon that opens KBar, shows cmd-k/ctrl-k hint on desktop
- **Mobile optimizations** — full-screen modal, slide-up animation, touch-friendly targets (44px min)
- **Static page seeding** — add Contact, Team, Impressum, Datenschutz to search index via script
- **Search analytics** — `POST /api/analytics/search` endpoint, fire-and-forget logging (query, locale, result count,
  zero-result flag). GDPR-compliant (no user IDs). Update Datenschutz page.
- **Edge cases for static JSON** — handle missing JSON, corrupted JSON, stale JSON (>24h indicator)

---

## Code Quality (from `2025-11-16-code-quality-improvements.md`)

Low-impact items deferred indefinitely:

- **Data caching** (#4) — Next.js `cache()` or `unstable_cache` for Payload service calls. Future infrastructure
  decision.
- **Error monitoring** (#5) — Sentry or similar. Pending decision on monitoring service. Design in
  `2025-11-11-gdpr-tracking-design.md`.
- **Magic numbers** (#6) — Extract constants like animation durations, breakpoints, limits into named constants.
- **Zod type guards** (#7) — Runtime validation for external data. Requires adding `zod` as a dependency.
- **Prop type exports** (#12) — Export props interfaces (e.g. `export type { ArtistGridProps }`) for consumer use.
- **JSDoc on public APIs** (#16) — Add JSDoc to service functions and utility helpers.

---

## GDPR / Analytics (from `2025-11-11-gdpr-tracking-design.md`)

Full plan exists but nothing implemented yet:

- **Cookiebot** — Add consent banner (`NEXT_PUBLIC_COOKIEBOT_ID`)
- **Google Analytics GA4** — Blocked until Cookiebot consent (`NEXT_PUBLIC_GA4_ID`)
- **Sentry** — Consent-aware init via `SentryConsentInit` component (`NEXT_PUBLIC_SENTRY_DSN`)
- **`trackEvent` utility** — `src/utils/trackEvent.ts`, consent-gated custom event tracking

---

## Image Performance

- **Static imports for core assets** — logo, icon, default avatar currently served via `/api/images/file/...` (serverless function). Move to static imports for build-time optimization, eliminating serverless cold start on these assets. See `docs/optimizations.md` option 4.
- **`*.public.blob.vercel-storage.com` in `remotePatterns`** — hostname missing from `next.config.mjs`. Likely not breaking (Blob URLs bypass optimizer check) but should be added for correctness.

---

## ArtistLinks (from `2025-12-12-artist-links-component-design.md`)

Implemented, but the design called for a dedicated `ArtistLinksHomepage.tsx` sub-component and spec file. Currently the
homepage section is handled inline in `index.tsx`. This is a minor structural inconsistency:

- `ArtistLinksHomepage.tsx` — extract homepage section into its own sub-component to match the compound pattern used by
  Downloads and Social
- `ArtistLinksHomepage.spec.tsx` — unit tests for the homepage sub-component
