# TODO

## Data Migration: Posts

- [ ] Migrate posts from old site to new site

- Migrating translations impossible
- Migrate all projects
- Migrate all news posts from last year?

## Collections

- [ ] Ensure proper validation

## Media

- can use different blob storage adapters per collection: <https://www.youtube.com/watch?v=HG0kOQiy_EU>

### URGENT: Vercel Blob Bandwidth Concerns

**Issue:** Currently using 866 MB / 10 GB (8.6%) monthly bandwidth, with 721.93 MB stored in ZIP files alone.

**Current Storage Breakdown:**

- 21 ZIP files: 721.93 MB (artist photo gallery downloads - most are 40-60 MB each)
- 23 PDF files: 3.85 MB
- 29 JPG files: 3.13 MB
- 64 WEBP files: 1.74 MB
- **Total: 731.55 MB across 139 files**

**Problem:**

- Every artist gallery download counts against 10 GB/month limit
- ~12 full downloads of all galleries would exhaust bandwidth
- Large ZIP files (40-60 MB each) are not suitable for Vercel Blob

**Recommended Solutions:**

1. **Move ZIP files to Cloudflare R2** (10GB free storage, unlimited egress bandwidth)
   - See: `docs/adr/2025-11-29-storage-migration-vercel-blob.md` (previous R2 setup)
   - Only keep images in Vercel Blob, move ZIPs to R2
2. **Alternative:** Remove ZIP downloads if rarely used, or host on WordPress temporarily
3. **Image optimization:** Ensure all images are WebP, compressed appropriately

**References:**

- Analysis script: `tmp/analyzeBlobUsage.ts`
- Storage breakdown documented: 2025-11-30
- Related: See AGENTS.md incident log for WordPress filename cleanup

## Monitoring

- [ ] Setup [Sentry Plugin](https://payloadcms.com/docs/plugins/sentry)
- db monitoring?

## SEO

- [ ] Setup [Seo Plugin](https://payloadcms.com/docs/plugins/seo)
- [ ] Setup [Redirect Plugin](https://payloadcms.com/docs/plugins/redirects)

## UI

- Add "Back to top" button
- Enhance image slider banner (news title)
- Localized 404 page

### Pages

- [ ] Add Impressum page
- [ ] Add Datenschutz page

### Artist Feature Enhancements (Optional)

- [ ] Further enhance the artist detail page (add social links, downloads, YouTube, etc.)
- [ ] Add error handling, loading states, or SEO meta tags to artist detail page
- [ ] Reuse the ImageSlider on the homepage or other pages
- [ ] Add tests for ImageSlider, ImageSlide, and artist detail page
- [ ] Update documentation for new components and features
