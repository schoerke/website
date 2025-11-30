# Architectural Decision Record: Storage Migration to Vercel Blob

**Date:** 2025-11-29  
**Status:** ✅ IMPLEMENTED (Artists & Employees Complete)  
**Supersedes:** [2025-10-26-cloudflare-r2-image-storage-design.md](../plans/2025-10-26-cloudflare-r2-image-storage-design.md)

## Context

We currently store media files (images, PDFs, ZIPs) in Cloudflare R2 using Payload CMS's S3 storage adapter. This setup
has encountered several critical issues on Vercel's serverless platform:

### Problems with Current Approach

1. **Admin panel thumbnails broken** - Known Payload CMS bug (#14128) causes `staticHandler` to fail on serverless
   environments
2. **500 errors on preview deployments** - Streaming issues in serverless functions
3. **Serverless incompatibility** - R2 adapter not optimized for Vercel's execution model
4. **Official guidance** - Payload explicitly recommends Vercel Blob (not S3/R2) for Vercel deployments

### Requirements

- Support images up to 15MB (high-res photos)
- Support documents up to 60MB (large ZIP files)
- Zero downtime during migration
- Maintain disaster recovery backups
- Fix admin panel and preview deployment issues
- Stay within free tier (Hobby plan)

## Decision

We will **migrate from Cloudflare R2 to Vercel Blob** with the following architecture:

### Storage Strategy

- **Images Collection** → Vercel Blob (hybrid upload: <4.5MB server, >4.5MB direct)
- **Documents Collection** → Vercel Blob (hybrid upload: <4.5MB server, >4.5MB direct)
- **Backup** → AWS S3 (automated daily backups via GitHub Actions)

### Organizational Structure

- **GitHub Organization:** `schoerke` (existing org, repo already at `schoerke/website`)
- **Vercel Account:** New separate `schoerke` account (Hobby plan, free)
- **Isolation:** Dedicated 100GB Blob storage quota, separate from other projects

**Rationale for Separate Vercel Account:** Instead of creating a paid Pro team ($20/month) under the existing `zeitchef`
Vercel account, we create a new free Hobby account. This provides the same isolation benefits (dedicated 100GB Blob
quota) at zero cost. Vercel ToS allows multiple personal accounts, and this is a legitimate use case for separating
projects.

- **Backup** → AWS S3 (automated daily backups via GitHub Actions)

### Organizational Structure

- **GitHub Organization:** `schoerke` (new org, transferred from `zeitchef/schoerke-website`)
- **Vercel Team:** `ks-schoerke` (dedicated team with isolated 100GB Blob quota)
- **Isolation:** Separate from other projects to prevent quota conflicts

### Collection Architecture

Split the monolithic `media` collection into two domain-specific collections:

1. **Images** - Photos, artwork, thumbnails (MIME: `image/*`)
2. **Documents** - PDFs, ZIPs, downloadable files (MIME: `application/pdf`, `application/zip`)

## Rationale

### Why Vercel Blob?

**Technical:**

- Official Payload recommendation for Vercel deployments
- Native serverless compatibility (no streaming issues)
- Fixes bug #14128 (admin panel thumbnails)
- Automatic CDN integration
- No custom domain/DNS configuration required

**Operational:**

- Simpler architecture (one storage system vs two)
- Zero configuration (auto-provision on Vercel)
- Unified developer experience
- Less credential management

**Cost:**

- Free under 100GB (currently ~12.5GB usage = 8x headroom)
- No egress fees
- Cost increase negligible (~$1-9/month for S3 backups only)

### Why Separate Collections?

**Code Quality:**

- Clear domain separation (images vs documents)
- Type-safe relationships (artist.photo → images, artist.pressKit → documents)
- Explicit intent in code

**User Experience:**

- Admin panel clarity (separate sections)
- Different upload workflows (images = thumbnails, documents = raw)
- Better organization at scale

### Why Not Keep R2?

**Complexity:**

- R2 + Vercel Blob = two storage systems to maintain
- Dual backups required
- More failure points

**Technical Issues:**

- Doesn't solve serverless compatibility problems
- Admin panel thumbnails still broken
- Workarounds add complexity

**Cost:**

- Savings minimal (~$0.10/month vs $0)
- Not worth engineering time and ongoing maintenance

## Trade-offs

### Accepted Limitations

1. **Hybrid upload complexity** - Need file size detection and dual upload paths for files >4.5MB
2. **Vendor lock-in** - Tighter coupling to Vercel ecosystem (acceptable given deployment platform)
3. **Backup management** - Must implement separate S3 backup automation (GitHub Actions)

### Rejected Alternatives

**Option A: Keep R2, fix with CloudFlare Workers**

- ❌ More complexity (Workers + R2 + custom domain)
- ❌ Doesn't fix admin panel issues
- ❌ Still requires workarounds for serverless

**Option B: AWS S3 for documents, Vercel Blob for images**

- ❌ Two storage systems = 2x complexity
- ❌ Still under 100GB free tier with unified approach
- ❌ Cost savings negligible

**Option C: Keep unified media collection**

- ❌ Less clear domain separation
- ❌ Mixed concerns in code (images + documents together)
- ❌ Harder to optimize per file type

## Implementation

**Status: ✅ Completed 2025-11-30 (Artists & Employees)**

### Infrastructure Complete

- ✅ Vercel Blob storage configured with `BLOB_READ_WRITE_TOKEN`
- ✅ Created `Images` collection (31 records)
- ✅ Created `Documents` collection (45 records)
- ✅ Removed old `Media` collection from codebase
- ✅ Removed Cloudflare R2 plugin (`@payloadcms/storage-s3`)
- ✅ Cleaned up environment variables (removed all R2 vars)

### Migrations Completed

- ✅ **Artists:** 23/23 migrated with images and documents from WordPress
- ✅ **Employees:** 4/4 migrated with images from WordPress
- ✅ All files uploaded to Vercel Blob using hybrid upload strategy
- ✅ Database relationships verified (no foreign key errors)

### Collection Updates Complete

All collections updated to use `images` and `documents`:

- `Artists.ts`: image → `images`, PDFs/ZIPs → `documents`
- `Posts.ts`: image → `images`
- `Employees.ts`: image → `images`
- `Recordings.ts`: coverArt → `images`

### Remaining (Not Required for Vercel Migration)

- Posts migration (script needs work before running)
- Recordings migration (script needs work before running)
- AWS S3 backup automation (waiting for client bucket setup)

**See detailed design:**
[2025-11-29-vercel-blob-migration-design.md](../plans/2025-11-29-vercel-blob-migration-design.md)

## Consequences

### Positive

- ✅ Admin panel thumbnails work immediately
- ✅ No more 500 errors on preview deployments
- ✅ Simpler architecture (one storage system)
- ✅ Zero configuration overhead
- ✅ Better code organization (separate collections)
- ✅ Free storage (well under 100GB limit)
- ✅ Fast CDN delivery

### Negative

- ❌ Migration effort required (one-time)
- ❌ Hybrid upload logic adds code complexity (manageable)
- ❌ Slight vendor lock-in (acceptable trade-off)
- ❌ Must implement backup automation (planned)

### Monitoring

- **Vercel Blob usage** - Check dashboard monthly, alert at 80GB (80% of free tier)
- **Backup success rate** - Monitor GitHub Actions logs for failures
- **Frontend performance** - Verify CDN delivery speeds remain fast
- **Upload errors** - Track large file uploads (>4.5MB) for direct Blob failures

## Future Considerations

- If approaching 100GB limit: Implement delta backups or consider paid tier
- If needing S3-specific features: Re-evaluate hybrid storage (Blob + S3)
- If Payload releases Vercel Blob improvements: Simplify hybrid upload logic
- If egress costs become significant: Re-evaluate CloudFlare R2 with Workers

## Related Documents

- [Database Selection ADR](2025-10-26-database-selection.md)
- [Database Backup Strategy](2025-11-23-database-backup-strategy.md)
- [Vercel Blob Migration Design](../plans/2025-11-29-vercel-blob-migration-design.md) (detailed implementation)
- [Vercel Image 500 Investigation](../plans/2025-11-29-vercel-image-500-investigation.md) (problem analysis)

## Approval

- **Approved by:** Scott Schoerke
- **Date:** 2025-11-29
- **Implementation target:** Immediate (after design review)
