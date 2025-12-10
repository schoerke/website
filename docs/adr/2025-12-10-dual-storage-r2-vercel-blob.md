# Architectural Decision Record: Dual Storage Architecture (R2 + Vercel Blob)

**Date:** 2025-12-10  
**Status:** ✅ IMPLEMENTED  
**Related:** [2025-11-29-storage-migration-vercel-blob.md](2025-11-29-storage-migration-vercel-blob.md)

## Context

After migrating from Cloudflare R2 to Vercel Blob (ADR 2025-11-29), we discovered a critical bandwidth limitation:

### Problem Discovery

- **Vercel Blob free tier:** 10GB/month bandwidth limit
- **Current usage:** 866 MB / 10 GB (8.6%) after minimal testing
- **Storage breakdown:** 139 files, 731.55 MB total
  - 21 ZIP files: 721.93 MB (artist photo galleries, 40-60 MB each)
  - 23 PDF files: 3.85 MB
  - 29 JPG files: 3.13 MB
  - 64 WEBP files: 1.74 MB

### The Bandwidth Problem

- **Artist gallery downloads** consume significant bandwidth
- ~12 full downloads of all galleries would exhaust monthly limit
- Large ZIP files (40-60 MB each) are poorly suited for Vercel Blob
- Images benefit from Next.js optimization and Edge CDN caching (bandwidth efficient)
- Large downloads do not benefit from image optimization (bandwidth inefficient)

## Decision

We will implement a **dual storage architecture** with domain-specific storage:

### Storage Strategy

- **Images Collection** → **Vercel Blob** (optimized for Next.js Image component)
- **Documents Collection** → **Cloudflare R2** (unlimited egress bandwidth for large downloads)

### Technical Implementation

**Payload CMS Configuration** (`src/payload.config.ts`):

```typescript
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

export default buildConfig({
  plugins: [
    // Images: Vercel Blob (optimized for Next.js)
    vercelBlobStorage({
      enabled: true,
      collections: {
        images: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),

    // Documents: Cloudflare R2 (unlimited bandwidth)
    s3Storage({
      enabled: true,
      collections: {
        documents: true,
      },
      bucket: process.env.CLOUDFLARE_S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_S3_ACCESS_KEY || '',
          secretAccessKey: process.env.CLOUDFLARE_SECRET || '',
        },
        region: 'auto',
        endpoint: process.env.CLOUDFLARE_S3_API_ENDPOINT || '',
        forcePathStyle: true,
      },
      disablePayloadAccessControl: true,
    }),
  ],
})
```

**Environment Variables** (`.env`):

```bash
# Vercel Blob (Images)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Cloudflare R2 (Documents)
CLOUDFLARE_S3_BUCKET=schoerke-website
CLOUDFLARE_S3_ACCESS_KEY=your_r2_access_key
CLOUDFLARE_SECRET=your_r2_secret_key
CLOUDFLARE_S3_API_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
NEXT_PUBLIC_R2_HOSTNAME=https://pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev
```

## Rationale

### Why Dual Storage?

**Technical Benefits:**

- **Images:** Next.js `<Image>` component optimization, automatic resizing, Edge CDN caching
- **Documents:** No bandwidth limits for large file downloads (ZIP galleries, large PDFs)
- **Payload native support:** Both storage adapters are officially maintained by Payload team

**Cost Efficiency:**

- Vercel Blob bandwidth: 10GB/month free (sufficient for optimized images)
- Cloudflare R2 bandwidth: Unlimited egress (free for all downloads)
- Current storage costs: ~$0/month (under both free tiers)

**Performance:**

- Images: Cached on Vercel Edge after first request (fast subsequent loads)
- Documents: Direct R2 public URLs (no serverless function overhead)

### Why Not Keep Single Storage?

**Option A: Vercel Blob Only**

- ❌ Bandwidth limit would be exceeded with gallery downloads
- ❌ Would require paid tier ($0.15/GB bandwidth) = ~$10-20/month
- ❌ No benefit for large non-image files

**Option B: R2 Only**

- ❌ Misses Next.js Image optimization benefits
- ❌ No Edge CDN caching for images
- ❌ Previous serverless compatibility issues (bug #14128)
- ❌ Slower image loading (no automatic optimization)

## Implementation

**Status: ✅ Completed 2025-12-10**

### Phase 1: Infrastructure Setup

- ✅ Installed `@payloadcms/storage-s3` package (v3.68.1)
- ✅ Added R2 environment variables to `.env.example`
- ✅ User added actual R2 credentials to `.env`
- ✅ Updated `src/payload.config.ts` with dual plugin configuration

### Phase 2: Payload Configuration

- ✅ `vercelBlobStorage` plugin configured for `images` collection
- ✅ `s3Storage` plugin configured for `documents` collection
- ✅ R2 connection tested successfully (bucket contains all files)

### Phase 3: Database Migration

- ✅ Created migration script `tmp/migrateDocumentsToR2.ts`
- ✅ Dry-run verified 45 documents (22 ZIPs + 23 PDFs) exist in R2
- ✅ Executed migration with `--execute` flag
- ✅ Updated 45 database records: `/api/documents/file/{filename}` → R2 public URLs
- ✅ User verified downloads work (tested ZIP and PDF)

### Phase 4: Storage Cleanup

- ✅ Created cleanup scripts (`tmp/cleanupVercelBlobDocuments.ts`, `tmp/cleanupR2Images.ts`)
- ✅ Deleted 44 documents from Vercel Blob (21 ZIPs + 23 PDFs) - freed 725.78 MB
- ✅ Deleted 117 images from R2 (65 WEBP + 40 JPG + 10 PNG + 2 JPEG) - freed 6.78 MB
- ✅ Vercel Blob now contains: 103 image files only
- ✅ R2 now contains: 46 document files only (ZIPs + PDFs)

### Files Modified

- `package.json` - re-added `@payloadcms/storage-s3`
- `.env.example` - added 5 R2 variables
- `src/payload.config.ts` - dual storage plugin configuration
- Database `documents` table - 45 URL records updated

## Trade-offs

### Accepted Complexity

1. **Two storage systems** - Images in Vercel Blob, documents in R2
   - **Mitigation:** Both use Payload's official plugins (well-maintained)
   - **Benefit:** Domain-specific optimization (images vs downloads)

2. **Dual credential management** - Two sets of API keys/tokens
   - **Mitigation:** Standard environment variable pattern
   - **Benefit:** Security isolation (separate access controls)

3. **Mixed URL patterns** - Vercel Blob URLs vs R2 URLs
   - **Mitigation:** Transparent to end users (both are CDN URLs)
   - **Benefit:** Best performance for each file type

### Rejected Alternatives

**Option C: Move Images to R2 Too**

- ❌ Loses Next.js Image optimization benefits
- ❌ No Edge CDN caching
- ❌ Slower image loading
- ❌ Previous serverless issues resurface

**Option D: Self-host on AWS S3**

- ❌ More expensive (~$5-15/month)
- ❌ Additional infrastructure to manage
- ❌ Doesn't solve bandwidth or optimization needs

## Consequences

### Positive

- ✅ **Bandwidth solved:** Unlimited downloads for artist galleries
- ✅ **Image performance:** Next.js optimization + Edge CDN caching
- ✅ **Cost efficient:** $0/month under both free tiers
- ✅ **Future-proof:** Can scale to hundreds of galleries without bandwidth concerns
- ✅ **Best of both worlds:** Optimized images + unlimited downloads

### Negative

- ❌ **Complexity:** Two storage systems to maintain
- ❌ **Credentials:** Two sets of API keys to manage
- ❌ **Mental model:** Developers must understand which storage for which file type

### Monitoring

- **Vercel Blob usage:** Check monthly, expect <2GB bandwidth (images only)
- **R2 usage:** Check storage size (currently 731 MB, under 10GB free tier)
- **Download metrics:** Track gallery download frequency
- **Image CDN hit rate:** Monitor Vercel Edge cache performance

## Future Considerations

- **If image storage exceeds 100GB:** Move to R2 (still benefit from Next.js optimization via remote URLs)
- **If R2 storage exceeds 10GB free tier:** Evaluate paid tier ($0.015/GB = ~$1.50/month for 100GB)
- **If bandwidth patterns change:** Re-evaluate storage assignments
- **If Payload releases improvements:** Simplify dual-plugin configuration

## Verification

**Tested on 2025-12-10:**

- ✅ New image uploads → Vercel Blob (automatic via plugin)
- ✅ New document uploads → R2 (automatic via plugin)
- ✅ Existing images → Vercel Blob URLs work
- ✅ Existing documents → R2 URLs work
- ✅ Admin panel thumbnails work (Vercel Blob images)
- ✅ Gallery downloads work (R2 ZIPs)

## Related Documents

- [Storage Migration to Vercel Blob ADR](2025-11-29-storage-migration-vercel-blob.md) - Original migration from R2-only
- [Database Backup Strategy](2025-11-23-database-backup-strategy.md) - Backup considerations
- [Performance Optimizations](../optimizations.md) - Image optimization strategies
- [TODO: Media Section](../todo.md) - R2 migration tracking

## Approval

- **Approved by:** Scott Schoerke
- **Date:** 2025-12-10
- **Implementation:** Complete
