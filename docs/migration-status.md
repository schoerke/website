# Vercel Blob Migration Status

**Last Updated:** 2025-11-30

## Quick Reference

- **Design Doc:** `docs/plans/2025-11-29-vercel-blob-migration-design.md`
- **Status:** ✅ **Complete (Artists & Employees)**

## Current State

### ✅ Completed

**Infrastructure:**

- Vercel Blob storage enabled with `BLOB_READ_WRITE_TOKEN`
- Collections created: `Images` (31 records), `Documents` (45 records)
- Old `Media` collection removed from codebase
- Cloudflare R2 plugin removed from config

**Migrations:**

- **Artists:** 23/23 complete with images and documents from WordPress
- **Employees:** 4/4 complete with images from WordPress
- All images and documents uploaded to Vercel Blob
- Database relationships verified and working

**Code:**

- All collections updated to use `images` and `documents`:
  - `Artists.ts`: image → `images`, PDFs/ZIPs → `documents`
  - `Posts.ts`: image → `images`
  - `Employees.ts`: image → `images`
  - `Recordings.ts`: coverArt → `images`
- Migration scripts updated for Vercel Blob hybrid upload

### 🔄 Pending (Not Required for Vercel Migration)

**WordPress Migrations:**

- Posts migration script needs work before running
- Recordings migration script needs work before running

**Future Work:**

- Setup AWS S3 backup automation (waiting for client bucket)
- Update documentation to reflect completed state

## Migration Details

### Images Collection (31 records)

- Artist profile photos (23)
- Employee headshots (4)
- Additional artist images (4)
- Uploaded via Vercel Blob hybrid strategy

### Documents Collection (45 records)

- Artist PDFs (biographies, press kits)
- Artist ZIP files (media galleries)
- All files uploaded successfully to Vercel Blob

### Hybrid Upload Strategy

Successfully implemented for files >4.5MB:

- Small files (≤4.5MB): Upload via Payload API (server upload)
- Large files (>4.5MB): Direct Blob upload + manual record creation
- All 60MB ZIP files handled correctly

## Database: Remote Turso (`ksschoerke-development`)

| Collection | Records | Status                    |
| ---------- | ------- | ------------------------- |
| Artists    | 23      | ✅ Complete               |
| Employees  | 4       | ✅ Complete               |
| Images     | 31      | ✅ Complete               |
| Documents  | 45      | ✅ Complete               |
| Posts      | 0       | ⏸️ Pending script updates |
| Recordings | 0       | ⏸️ Pending script updates |

## Key Learnings

### Image ID Mapping Issues

**Problem:** Foreign key constraint errors during employee migration.

**Root Cause:** `media-id-map.json` contained outdated IDs that didn't match actual database records.

**Solution:**

- Upload missing images to Vercel Blob
- Update `media-id-map.json` with correct Payload IDs
- Always verify image IDs exist in database before migration

**Prevention:** Added to AGENTS.md - always verify database environment and check foreign key relationships before
migrations.

### WordPress Attachment Resolution

**Problem:** Employee thumbnail IDs from WordPress XML didn't resolve to files.

**Root Cause:**

- Some attachment IDs referenced in WordPress XML weren't in the exported attachment list
- Files existed locally but needed manual upload

**Solution:**

- Check `media-urls.json` for all referenced attachments
- Upload missing files manually to Vercel Blob
- Update migration map before running live migration

## Environment Variables

**Active:**

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob (Images + Documents)
- `DATABASE_URI` - Turso (remote)
- `DATABASE_AUTH_TOKEN` - Turso auth

**Removed:**

- `CLOUDFLARE_S3_BUCKET` - No longer needed
- `CLOUDFLARE_S3_ACCESS_KEY` - No longer needed
- `CLOUDFLARE_SECRET` - No longer needed
- `CLOUDFLARE_S3_API_ENDPOINT` - No longer needed
- `NEXT_PUBLIC_S3_HOSTNAME` - No longer needed

## Files Modified This Session

**Removed:**

- `src/collections/Media.ts` - Old R2-based media collection
- Cloudflare R2 plugin configuration from `payload.config.ts`

**Updated:**

- `scripts/wordpress/data/media-id-map.json` - Added employee image IDs (28-31)
- `scripts/wordpress/migrateEmployees.ts` - Fixed dotenv import

**Created:**

- Employee images uploaded to Vercel Blob (IDs 28-31)

## Success Criteria

- ✅ All artist images migrated to Vercel Blob
- ✅ All artist documents (PDFs, ZIPs) migrated to Vercel Blob
- ✅ All employee images migrated to Vercel Blob
- ✅ Admin panel thumbnails work (no 500 errors)
- ✅ Database relationships correct (no foreign key errors)
- ✅ Old Media collection removed from codebase
- ✅ Cloudflare R2 configuration removed

## Related Documents

- [Design Document](plans/2025-11-29-vercel-blob-migration-design.md)
- [ADR: Storage Migration](adr/2025-11-29-storage-migration-vercel-blob.md)
- [Database Backup Strategy](adr/2025-11-23-database-backup-strategy.md)
