# TODO

## Search

- [ ] **Search API timing out / aborting — observed in browser console** — 2026-08-27
  - While testing locally, `/api/search` repeatedly logged: `API search failed, falling back to static JSON: AbortError` (from the abort-on-new-keystroke logic in `src/services/search.ts:110`) and `Error: API timeout after 2000ms` (`src/services/search.ts:124`).
  - The abort logs are by-design (each keystroke aborts the prior in-flight request); the **2000ms timeout** is the real problem — the API route is slow (likely cold-start/Payload init in dev), so real searches degrade to the static JSON fallback.
  - **Deferred** — decided to address later, after the artist-detail data-fetching work.
  - **To investigate:** whether prod `/api/search` also exceeds 2000ms (raise/remove timeout? warm the route? cache search results?) — see related item below.
  - **Files:** `src/services/search.ts`, `src/components/Search/SearchProvider.tsx`

- [ ] **Search returns no results on prod for non-artist queries (e.g. "cello")** — 2026-05-25
  - Two root causes identified:
    1. **Static JSON fallback is too shallow** — `public/search-index-de.json` only has 34 docs (artist display names only). Repertoire, instruments, biographies not indexed. When API fails, fallback returns nothing for content-based queries.
    2. **API may be timing out on prod** — 2000ms timeout in `src/services/search.ts:125`. Seen timing out in dev logs; unclear if prod `/api/search?q=cello` returns correct results at all.
  - **To investigate:** Hit `/api/search?q=cello&locale=de&limit=50` directly on prod to confirm whether the API itself returns results
  - **Files:** `src/services/search.ts`, `public/search-index-de.json`, `public/search-index-en.json`
  - **Effort:** Medium — static index regeneration + possibly raising/removing timeout

## Code Quality

### Data-fetching performance audit — progress (2026-08-27)

Completed (see git log: `perf:`/`fix(revalidate):`/`style(ui):` commits):
- Homepage: slider posts slimmed, artist grid images slimmed, logo lookups `React.cache()`d (4→2/request)
- Artist detail: `getArtistBySlug` collapsed to ONE depth-2 query (was 3), route now SSG via `generateStaticParams` (49 artists × 2 locales), news/recordings tabs slimmed
- Revalidation: artist pages purged on employee/project/repertoire/document changes (gated the static conversion)
- News/projects lists: `getPostListData` wrapper with slim select/populate baked in
- Gallery skeleton overlay fix (no layout reflow)

#### Remaining performance items

- [ ] **Lazy-load employee fetch in SearchProvider** — `src/components/Search/SearchProvider.tsx:237-254` fetches ALL employees on every page mount (layout-level provider). Move to first KBar open. Also `fetchEmployees` action (`src/actions/employees.ts:22-33`) fetches all then slices — pass `limit` down to the service. **Effort:** Small
- [ ] **Slim `/api/search` artist subquery** — `src/app/api/search/route.ts:106-115` artist lookup uses `depth: 1` populating unused `image`; only `contactPersons` is consumed. Add `select: { contactPersons: true }`. **Effort:** Small
- [ ] **Slim post detail pages** — `src/app/(frontend)/[locale]/news/[slug]/page.tsx` + `projects/[slug]/page.tsx`: `generateStaticParams` runs `getFilteredPosts` (limit 100, depth 1, FULL content) when only `slug` is needed — add `select: { slug: true }`; `getPostBySlug` populates unused `createdBy` — `select` to drop it; `getPostSlugByIdAndLocale` (`post.ts`) fetches whole doc for one slug — `select: { slug: true }`. **Effort:** Small
- [ ] **Contact/kontakt page image population** — `getEmployees` returns depth 0 → employee `image` stays a bare ID → TeamMemberCard renders placeholder. Decide: populate image (depth 1 / populate) or accept placeholders. **Effort:** Small–Medium
- [ ] **News/projects pages caching** — both `dynamic = 'force-dynamic'` and read `searchParams`, so page 1 without search re-queries DB every request. Investigate: static shell + Suspense for searchParams, or ISR per pathname. Slim select already applied (payload cut done); caching is the remaining win. **Effort:** Medium
- [ ] **Recordings coverArt returns null at depth ≥ 1 on dev.db** — `recordings` collection (has `versions.drafts`) fails to populate the `coverArt` upload relationship (returns null), while `artist.image` populates fine. Behavior identical before/after the slim refactor, but covers may show placeholders. Investigate Payload versions-table + upload relationship population. **Effort:** Medium
- [ ] **Dead code cleanup** — unused service functions with `limit: 0` / `depth: 2` shapes (specs-only, over-fetching if ever reused): `getAllPosts`, `getAllNewsPosts`, `getAllProjectPosts`, `getAllHomepagePosts`, `getAllNewsPostsByArtist`, `getAllProjectPostsByArtist` (`post.ts`), `getAllRecordings`, `getRecordingById` (`recording.ts`), `getEmployeeById`, `getEmployeeByName` (`employee.ts`), `getPages` (`page.ts`). Delete. **Effort:** Small
- [ ] **Homepage global + slider micro-slim** — `getHomePage` global: add `select` for the 3 intro strings; homepage slider: add explicit `limit`. **Effort:** Trivial

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

## Monitoring & Auditing

- [ ] Setup [Sentry Plugin](https://payloadcms.com/docs/plugins/sentry)
- db monitoring?
- SEO auditing?
- Lighthouse
- a11y

## SEO

- [ ] Setup [Seo Plugin](https://payloadcms.com/docs/plugins/seo)
- [ ] Setup [Redirect Plugin](https://payloadcms.com/docs/plugins/redirects)

- what redirects do we need? (e.g. old site URLs, non-localized URLs, etc.)

## UI

- Add "Back to top" button

### Artist Feature Enhancements (Optional)

- [ ] Add SEO meta tags to artist detail page
- [ ] Update documentation for new components and features
