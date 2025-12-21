# TODO

## Code Quality

- [x] **TypeScript/ESLint Cleanup** - ✅ **COMPLETE** (2025-12-10)
  - **Status:** 0 errors, 0 warnings (down from 78 problems)
  - All `any` types replaced with proper types
  - **Build:** ✅ Passing | **Tests:** ✅ 203/203 passing

### 404 Error Handling - Code Review Follow-ups (2025-12-21)

- [x] **Critical Issues** - ✅ **COMPLETE** (2025-12-21)
  - Added missing translation keys to `en.ts` and `de.ts`
  - Fixed type safety violations in `global-not-found.tsx` (removed all `any` types)
  - Verified font handling (Inter font loaded via globals.css)
  - Audited redundant not-found files (converted `(frontend)/not-found.tsx` to redirect)
  - Added Accept-Language fallback for better international UX

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


## Data Migration: Posts

- [ ] Migrate posts from old site to new site

- Migrating translations impossible
- Migrate all projects
- Migrate all news posts from last year?

## Collections

- [ ] Ensure proper validation

## Media

- can use different blob storage adapters per collection: <https://www.youtube.com/watch?v=HG0kOQiy_EU>

### ✅ Vercel Blob Bandwidth Concerns - RESOLVED (2025-12-10)

**Issue (Discovered 2025-11-30):** Vercel Blob bandwidth limit (10GB/month) insufficient for large ZIP downloads.

**Solution Implemented:** Dual storage architecture (see ADR 2025-12-10-dual-storage-r2-vercel-blob.md)

- **Images Collection** → Vercel Blob (Next.js optimization, Edge CDN)
- **Documents Collection** → Cloudflare R2 (unlimited bandwidth)

**Migration Results:**

- 45 documents migrated to R2 (22 ZIPs + 23 PDFs)
- 721.93 MB of ZIPs no longer count against Vercel Blob bandwidth
- Zero monthly cost (under both free tiers)
- Downloads tested and verified working

**Current Storage Architecture:**

- Vercel Blob: Images only (~8 MB) - for Next.js optimization
- Cloudflare R2: All documents (731.55 MB) - for unlimited downloads

**References:**

- ADR: `docs/adr/2025-12-10-dual-storage-r2-vercel-blob.md`
- Migration script: `tmp/migrateDocumentsToR2.ts` (can be deleted after verification period)

## Monitoring

- [ ] Setup [Sentry Plugin](https://payloadcms.com/docs/plugins/sentry)
- db monitoring?

## SEO

- [ ] Setup [Seo Plugin](https://payloadcms.com/docs/plugins/seo)
- [ ] Setup [Redirect Plugin](https://payloadcms.com/docs/plugins/redirects)

## UI

- Add "Back to top" button
- Enhance image slider banner (news title)
- [x] Localized 404 page - ✅ **COMPLETE** (2025-12-21)
  - Implemented `global-not-found.tsx` with `experimental.globalNotFound`
  - Added proper locale detection (x-locale, cookie, Accept-Language, default)
  - Consistent branded 404 with header/footer across all locales
  - Redirect from non-localized URLs to localized versions

### Pages

- [ ] Add Impressum page
- [ ] Add Datenschutz page

### Artist Feature Enhancements (Optional)

- [ ] Further enhance the artist detail page (add social links, downloads, YouTube, etc.)
- [ ] Add error handling, loading states, or SEO meta tags to artist detail page
- [ ] Reuse the ImageSlider on the homepage or other pages
- [ ] Add tests for ImageSlider, ImageSlide, and artist detail page
- [ ] Update documentation for new components and features
