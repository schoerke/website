# Vercel Blob Migration Status

**Last Updated:** 2025-11-30

## Quick Reference

- **Design Doc:** `docs/plans/2025-11-29-vercel-blob-migration-design.md`
- **Branch:** `feature/vercel-blob-migration`
- **Status:** Phase 4 Complete (Migration Scripts Updated)

## Progress Tracker

### Phase 1: Prerequisites ✅

- [x] Client Vercel account created
- [x] Vercel project imported (`schoerke/website`)
- [x] Vercel Blob storage enabled
- [x] `BLOB_READ_WRITE_TOKEN` obtained
- [x] Dependencies installed (`@payloadcms/storage-vercel-blob`, `@vercel/blob`)
- [x] All Payload packages upgraded to 3.65.0

### Phase 2: Collection Schema Updates ✅

- [x] Created `src/collections/Images.ts` with Vercel Blob config
- [x] Created `src/collections/Documents.ts` with Vercel Blob config
- [x] Updated `src/payload.config.ts` (registered collections, added vercelBlobStorage plugin)
- [x] Dependencies clean install (resolved version mismatches)
- [x] Dev server tested and working
- [x] Design document updated with Media collection strategy

**Key Decision:** Keep existing `Media` collection during migration for safety. Remove only after verification.

### Phase 3: Update Collection Relationships ✅

- [x] Update `src/collections/Artists.ts` (3 fields: image, biography PDF, gallery ZIP)
- [x] Update `src/collections/Posts.ts` (1 field: featured image)
- [x] Update `src/collections/Employees.ts` (1 field: headshot)
- [x] Update `src/collections/Recordings.ts` (1 field: cover art)

### Phase 4: Update Migration Scripts ✅

- [x] Rewrite `scripts/wordpress/utils/uploadLocalMedia.ts`
  - [x] Implement hybrid upload strategy (≤4.5MB via Payload, >4.5MB direct Blob)
  - [x] Route by MIME type (images vs documents)
  - [x] Generate separate ID maps: `images-id-map.json`, `documents-id-map.json`
  - [x] Create dry-run test script (`testUploadDryRun.ts`)
- [x] Update `scripts/wordpress/migrateArtists.ts`
  - [x] Load both ID maps (images and documents)
  - [x] Update `findMediaByFilename()` to accept collection parameter
  - [x] Route images to `'images'` collection (use `alt` field)
  - [x] Route PDFs/ZIPs to `'documents'` collection (use `title` field)
  - [x] Test with local database (dry-run successful)
- [x] Document `scripts/wordpress/migratePosts.ts`
  - [x] Add JSDoc with media handling pattern
  - [x] Note: Full implementation needed separately (skeleton only)

**Commits:**

- `819445c` - Update uploadLocalMedia for Vercel Blob with hybrid strategy
- `2a95f4a` - Update migrateArtists for new images/documents collections
- `b628f83` - Document migratePosts.ts media handling for Vercel Blob

### Phase 5: Execute Migration ⏳

- [ ] Drop database (fresh start)
- [ ] Upload media to Vercel Blob
- [ ] Migrate artists
- [ ] Migrate posts
- [ ] Verify in admin panel

### Phase 6: Cleanup ⏳

- [ ] Verify all images migrated
- [ ] Verify all documents migrated
- [ ] Test frontend display
- [ ] Test document downloads
- [ ] Remove `src/collections/Media.ts`
- [ ] Remove `Media` from `payload.config.ts`
- [ ] Remove `s3Storage` plugin (Cloudflare R2)

### Phase 7: Setup Backups ⏳

- [ ] Create `scripts/backupBlobToS3.js`
- [ ] Create `.github/workflows/backup-vercel-blob.yml`
- [ ] Test backup script manually
- [ ] Verify GitHub Actions workflow

## Collections Using Media (To Update)

| Collection | Field     | Type  | New Target |
| ---------- | --------- | ----- | ---------- |
| Artists    | image     | Image | images     |
| Artists    | biography | PDF   | documents  |
| Artists    | gallery   | ZIP   | documents  |
| Posts      | image     | Image | images     |
| Employees  | image     | Image | images     |
| Recordings | coverArt  | Image | images     |

## Important Notes

### Media Collection Strategy

- **Keep during migration** - Safety net for development
- **Remove after verification** - Only when all tests pass
- Not a special Payload collection, safe to delete after migration

### Hybrid Upload Strategy

- Files ≤4.5MB: Upload via Payload API (server upload)
- Files >4.5MB: Direct Blob upload + manual record creation
- Required due to Vercel serverless function body size limit

### Environment Variables

- **Added:** `BLOB_READ_WRITE_TOKEN` (Vercel auto-generated)
- **Keep for now:** Cloudflare R2 env vars (for existing Media collection)
- **Remove later:** R2 env vars after Media collection removed

## Next Steps

1. **Continue with Phase 3:** Update collection relationships in Artists, Posts, Employees, Recordings
2. **Review changes:** Ensure all fields updated correctly
3. **Test TypeScript:** Verify no compilation errors
4. **Proceed to Phase 4:** Update migration scripts

## Rollback Plan

If issues arise:

1. Git checkout to previous commit
2. Existing database still uses Media collection (unchanged)
3. Cloudflare R2 files still intact (not deleted)
4. Zero data loss risk

## Questions Resolved

**Q: Is Media collection special to Payload?** A: No, it's just a regular collection we created. Safe to remove after
migration.

**Q: Should we remove Media collection now or later?** A: Keep during migration for safety, remove only after successful
verification.

**Q: What if migration fails?** A: Keep Media collection, rollback code changes, existing data remains intact.
