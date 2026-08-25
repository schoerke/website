# TODO

## Search

- [ ] **Search returns no results on prod for non-artist queries (e.g. "cello")** — 2026-05-25
  - Two root causes identified:
    1. **Static JSON fallback is too shallow** — `public/search-index-de.json` only has 34 docs (artist display names only). Repertoire, instruments, biographies not indexed. When API fails, fallback returns nothing for content-based queries.
    2. **API may be timing out on prod** — 2000ms timeout in `src/services/search.ts:125`. Seen timing out in dev logs; unclear if prod `/api/search?q=cello` returns correct results at all.
  - **To investigate:** Hit `/api/search?q=cello&locale=de&limit=50` directly on prod to confirm whether the API itself returns results
  - **Files:** `src/services/search.ts`, `public/search-index-de.json`, `public/search-index-en.json`
  - **Effort:** Medium — static index regeneration + possibly raising/removing timeout

## Code Quality

- [ ] **CRITICAL: Project-wide DB data-fetching audit** - reduce total rows read
  - Analyze all data-fetching from the database across the project
  - Goal: reduce total number of rows read per request/render
  - **Effort:** Large

### 404 Error Handling - Code Review Follow-ups (2025-12-21)

- [ ] **Medium Priority** - Code quality improvements
  - [ ] Make home URL construction more robust
    - **Current:** `<a href={`/${locale}`}>` hardcodes `localePrefix: 'always'`
    - **Issue:** Would break if routing configuration changes
    - **Fix:** Extract to helper function that respects `routing.localePrefix` config
    - **Effort:** ~15 minutes
  - [ ] Create integration tests for 404 behavior
    - Test locale detection (x-locale header, cookie, Accept-Language)
    - Test redirect behavior from non-localized URLs
    - Verify correct HTTP status codes (404)
    - Test translation loading for both locales
    - **Effort:** ~1-2 hours
  - [ ] Add comprehensive documentation for 404 architecture
    - Document which not-found file handles which scenario
    - Explain when `global-not-found.tsx` vs `[locale]/not-found.tsx` vs `(frontend)/not-found.tsx` renders
    - Document locale detection fallback chain
    - Add architecture diagram if helpful
    - **Location:** Create `docs/404-architecture.md` or add to existing docs
    - **Effort:** ~30 minutes

## Monitoring

- [ ] Setup [Sentry Plugin](https://payloadcms.com/docs/plugins/sentry)
- db monitoring?

## SEO

- [ ] Setup [Seo Plugin](https://payloadcms.com/docs/plugins/seo)
- [ ] Setup [Redirect Plugin](https://payloadcms.com/docs/plugins/redirects)

- what redirects do we need? (e.g. old site URLs, non-localized URLs, etc.)

## UI

- Add "Back to top" button

### Artist Feature Enhancements (Optional)

- [ ] Add SEO meta tags to artist detail page
- [ ] Update documentation for new components and features
