# Vercel Blob Storage Migration Design

- **Date:** 2025-11-29
- **Status:** APPROVED
- **Supersedes:** 2025-10-26-cloudflare-r2-image-storage-design.md

## 1. Overview & Context

### Problem Statement

Images stored in Cloudflare R2 are not working on Vercel preview deployments due to a known Payload CMS bug (#14128) affecting serverless platforms. The bug causes 500 errors when using Payload's `staticHandler` to serve images through application URLs.

### Current State

- **Storage:** Cloudflare R2 (~652 images, ~6.5GB)
- **Issue:** Admin panel thumbnails broken, 500 errors on preview deployments
- **Root Cause:** Payload bug #14128 - streaming problems in `staticHandler.ts` on serverless
- **Payload Recommendation:** Use Vercel Blob (not S3/R2) for Vercel deployments

### Decision

Migrate from Cloudflare R2 to Vercel Blob storage with separate **Images** and **Documents** collections.

## 2. Architecture

### Storage Strategy

```
Images Collection → Vercel Blob (hybrid upload: <4.5MB server, >4.5MB direct)
Documents Collection → Vercel Blob (hybrid upload: <4.5MB server, >4.5MB direct)
Backup: Both → AWS S3 (cold storage via GitHub Actions)
```

### GitHub Organization & Vercel Team Setup

**IMPORTANT: Previous Blocking Issue**

The repository was previously located at `schoerke/website` but encountered issues connecting to Vercel, requiring a move to `zeitchef/schoerke-website`. The root cause was not documented. This migration includes an investigation phase to determine if the issue is resolved or requires a workaround.

#### Phase 0: Investigate GitHub Organization Connectivity

**Test Vercel + schoerke Org Connection:**

1. Go to Vercel dashboard (zeitchef account)
2. Click "Add New Project" → "Import Git Repository"
3. Check if `schoerke` organization appears in the list
4. If visible, check if repositories are accessible
5. Document any errors or permission issues

**Common Issues to Check:**

- **Vercel GitHub App not installed:** https://github.com/organizations/schoerke/settings/installations
  - Verify "Vercel" is installed
  - Ensure repository access is granted (All repos or specific repos including `website`)
  
- **Third-party app restrictions:** https://github.com/organizations/schoerke/settings/oauth_application_policy
  - If restricted, approve Vercel explicitly
  
- **Repository visibility:** Private repos require proper Vercel plan
  - Verify Hobby plan supports private org repos (it should)
  
- **Account permissions:** Verify `zeitchef` has proper access to `schoerke` org repos

**Decision Point:** Based on investigation results, proceed with Scenario A or B below.

---

#### Scenario A: schoerke Org Connection Works (Preferred)

**GitHub Organization:**
- **Name:** `schoerke` (existing organization, you are owner)
- **Repository:** Transfer `zeitchef/schoerke-website` → `schoerke/website`  
  *Note: Repo was previously at this location but moved due to Vercel connectivity issue*
- **Collaborator:** Add `zeitchef` with Admin role

**Transfer Steps:**
1. Go to: https://github.com/zeitchef/schoerke-website/settings
2. Scroll to "Danger Zone" → "Transfer repository"
3. New owner: `schoerke`
4. New repository name: `website`
5. Confirm transfer

**Vercel Team:**
- **Team name:** `ks-schoerke` (under `zeitchef` account)
- **Plan:** Hobby (free)
- **Blob Storage Quota:** Dedicated 100GB for this team
- **Benefits:** Isolated quota, clear organizational boundary

**Vercel Project Import:**
1. In `zeitchef` Vercel account, create new team `ks-schoerke`
2. Import project from `schoerke/website`
3. Connect GitHub repository
4. Copy environment variables from old project

---

#### Scenario B: schoerke Org Connection Blocked (Fallback)

**If Vercel cannot connect to `schoerke` org after investigation:**

**GitHub Repository:**
- **Keep current location:** `zeitchef/schoerke-website` (do not transfer)
- **Reason:** Avoid unknown blocking issue
- **Future:** Investigate org issue as separate task

**Vercel Team:**
- **Team name:** `ks-schoerke` (under `zeitchef` account)
- **Plan:** Hobby (free)
- **Blob Storage Quota:** Dedicated 100GB for this team
- **Benefits:** Still get quota isolation from other projects

**Vercel Project Import:**
1. In `zeitchef` Vercel account, create new team `ks-schoerke`
2. Import project from `zeitchef/schoerke-website`
3. Connect GitHub repository
4. Copy environment variables from old project

**Note:** You still get isolated Blob quota even without moving the repo. The GitHub org location is independent of Vercel team benefits.

---

      { name: 'tablet', width: 1024 },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'text' },
  ],
  access: authenticatedOrPublished,
}
```

**Documents Collection** (`src/collections/Documents.ts`):
```typescript
export const Documents: CollectionConfig = {
  slug: 'documents',
  upload: {
    mimeTypes: ['application/pdf', 'application/zip'],
    disableLocalStorage: true, // No image processing
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'fileSize', type: 'number', admin: { readOnly: true } },
  ],
  access: authenticatedOrPublished,
}
```

### Payload Configuration

**Updated `src/payload.config.ts`:**
```typescript
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

export default buildConfig({
  collections: [Images, Documents, Artists, Posts, ...],
  plugins: [
    vercelBlobStorage({
      collections: {
        images: true,
        documents: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    }),
  ],
})
```

**Environment Variables:**
- **Remove:** `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- **Add:** `BLOB_READ_WRITE_TOKEN` (auto-generated by Vercel)

**Package Changes:**
```bash
pnpm remove @payloadcms/storage-s3
pnpm add @payloadcms/storage-vercel-blob @vercel/blob
```

### Hybrid Upload Strategy

**Challenge:** Vercel serverless functions have 4.5MB request body limit.

**Solution:** Route by file size:

```typescript
import { put } from '@vercel/blob'

async function uploadFile(filePath: string, mimeType: string, collection: 'images' | 'documents') {
  const fileSize = fs.statSync(filePath).size
  const fileName = path.basename(filePath)
  
  if (fileSize <= 4.5 * 1024 * 1024) {
    // Small file: Use Payload API (server upload)
    return await payload.create({
      collection,
      data: { /* metadata */ },
      filePath,
    })
  } else {
    // Large file: Direct Blob upload + manual record
    const fileStream = fs.createReadStream(filePath)
    const blob = await put(fileName, fileStream, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    
    return await payload.create({
      collection,
      data: {
        filename: fileName,
        mimeType,
        filesize: fileSize,
        url: blob.url,
        /* other metadata */
      },
    })
  }
}
```

### File Size Constraints

**Vercel Blob Limits:**
- Maximum file size: 5TB (5,000GB)
- Server upload limit: 4.5MB (Vercel Function body size)
- Client upload recommended: Files >4.5MB
- Cache limit: 512MB (larger files not cached, still work)

**Project Requirements:**
- Images: Up to 15MB (high-res photos)
- Documents: Up to 60MB (large ZIP files)
- Both supported via hybrid upload strategy

## 3. Migration Execution

### Prerequisites

1. ✅ GitHub org created: `schoerke/website`
2. ✅ Vercel team created: `ks-schoerke`
3. ✅ Repository transferred and connected
4. ✅ Environment variables configured (`BLOB_READ_WRITE_TOKEN`)

### Step 1: Collection Schema Updates

**Create new collections:**
- `src/collections/Images.ts`
- `src/collections/Documents.ts`

**Update relationships in existing collections:**
```typescript
// Before (single media collection)
{
  name: 'photo',
  type: 'upload',
  relationTo: 'media',
}

// After (specific collections)
{
  name: 'photo',
  type: 'upload',
  relationTo: 'images', // Images only
}
{
  name: 'pressKit',
  type: 'upload',
  relationTo: 'documents', // Documents only
}
```

### Step 2: Update Migration Scripts

**Modify `uploadLocalMedia.ts`:**
- Implement hybrid upload logic (size-based routing)
- Route by MIME type: `image/*` → images, `application/pdf|zip` → documents
- Create media-id-map.json for both collections

**Route files by MIME type:**
```typescript
const collection = mimeType.startsWith('image/') ? 'images' : 'documents'
await uploadFile(localPath, mimeType, collection)
```

### Step 3: Execute Migration

```bash
# 1. Drop existing database (fresh start)
pnpm payload migrate:reset

# 2. Upload media to Vercel Blob
pnpm migrate:media # Creates images + documents collections

# 3. Migrate artists (references new image/document IDs)
pnpm migrate:artists

# 4. Migrate posts
pnpm migrate:posts

# 5. Verify in admin panel
pnpm dev
# Check: /admin/collections/images
# Check: /admin/collections/documents
```

### Step 4: Remove Old Media Collection

After verification:
- Delete `src/collections/Media.ts`
- Remove from `payload.config.ts` collections array

## 4. Backup Strategy (Vercel Blob → AWS S3)

### Automated Daily Backups

**GitHub Actions workflow** (`.github/workflows/backup-vercel-blob.yml`):
```yaml
name: Backup Vercel Blob to S3

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2am UTC
  workflow_dispatch: # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install @vercel/blob aws-sdk
      
      - name: Run backup script
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
          S3_BACKUP_BUCKET: schoerke-payload-backups
        run: node scripts/backupBlobToS3.js
```

**Backup script** (`scripts/backupBlobToS3.js`):
```javascript
import { list } from '@vercel/blob'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({ region: process.env.AWS_REGION })
const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD

async function backupBlobs() {
  const { blobs } = await list()
  
  for (const blob of blobs) {
    const response = await fetch(blob.url)
    const buffer = await response.arrayBuffer()
    
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BACKUP_BUCKET,
      Key: `${timestamp}/${blob.pathname}`,
      Body: Buffer.from(buffer),
      ContentType: blob.contentType,
    }))
    
    console.log(`Backed up: ${blob.pathname}`)
  }
}

backupBlobs().catch(console.error)
```

### Retention Policy

- **Daily backups:** Last 30 days
- **Monthly snapshots:** 1 year (archive on day 1 of each month)
- **S3 Lifecycle Policy:** Transition to Glacier after 30 days ($0.004/GB/month)

### Recovery Process

```bash
# 1. Download specific backup from S3
aws s3 sync s3://schoerke-payload-backups/2025-11-29/ ./recovery/

# 2. Upload to Vercel Blob
node scripts/restoreBlobFromS3.js ./recovery/

# 3. Update database records (if needed)
# Blob URLs remain stable, so existing DB records should still work
```

### Cost Estimate

- **Storage:** ~12.5GB × 30 days = 375GB stored
- **Cost:** 375GB × $0.023/GB = **~$8.60/month**
- **Optimization:** Delta backups reduce to ~50GB = **~$1.15/month**

## 5. Testing & Verification

### Pre-Migration Checklist

```bash
# 1. Verify GitHub org and Vercel team
- [ ] GitHub org 'schoerke' created
- [ ] Repository transferred: schoerke/website
- [ ] Vercel team 'ks-schoerke' created
- [ ] Project imported to ks-schoerke team
- [ ] zeitchef added as GitHub collaborator

# 2. Verify environment variables
- [ ] BLOB_READ_WRITE_TOKEN configured
- [ ] DATABASE_URI configured
- [ ] PAYLOAD_SECRET configured

# 3. Verify local development
- [ ] pnpm install
- [ ] pnpm dev starts successfully
- [ ] Admin panel accessible
```

### Migration Verification

```bash
# 1. Images collection
- [ ] Count matches WordPress image count
- [ ] Spot-check: 5 random images load
- [ ] Thumbnails generated correctly
- [ ] Vercel Blob dashboard shows files

# 2. Documents collection
- [ ] Count matches WordPress PDF/ZIP count
- [ ] Spot-check: 3 PDFs open correctly
- [ ] Spot-check: 1 ZIP downloads successfully
- [ ] Large files (>4.5MB) uploaded via direct Blob

# 3. Relationships
- [ ] Artist profile photos display
- [ ] Press kits link correctly
- [ ] Post featured images work
- [ ] No 404 errors in console
```

### Frontend Verification

```bash
# Deploy to Vercel preview
git push origin migration-branch

# Test pages:
- [ ] Homepage loads all images
- [ ] Artist list page
- [ ] Individual artist page
- [ ] Blog post with images
- [ ] Download document (PDF/ZIP)

# Performance:
- [ ] Images load from Vercel CDN
- [ ] No 500 errors
- [ ] Admin panel thumbnails work (bug #14128 fixed)
```

### Prefetch Verification (Conservative Strategy)

```typescript
// Prefetch on hover (bandwidth-friendly)
<a 
  href={document.url}
  onMouseEnter={() => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = document.url
    document.head.appendChild(link)
  }}
>
  Download Press Kit
</a>
```

**Verify:**
- [ ] Hover triggers prefetch
- [ ] Network tab shows prefetch request
- [ ] Click downloads instantly
- [ ] No prefetch on page load

## 6. Rollback Plan

### Pre-Migration Safety

```bash
# 1. Database backup
turso db shell your-db ".backup backup-pre-migration-$(date +%Y-%m-%d).db"
aws s3 cp backup-pre-migration-*.db s3://schoerke-payload-backups/

# 2. R2 files preserved
- [ ] R2 bucket contains all 652 files
- [ ] R2 credentials valid
- [ ] R2 bucket NOT deleted (30-day safety net)

# 3. Code safety
- [ ] Migration branch created
- [ ] Pre-migration tagged: git tag pre-vercel-blob-migration
- [ ] Environment variables backed up
```

### Rollback Scenarios

**Stage 1: Pre-Migration (Config Only)**
```bash
git revert <commit-hash>
# Restore R2 config and env vars
git push origin main
```
**Recovery time:** ~5 minutes  
**Data loss:** None

**Stage 2: Mid-Migration (Partial Upload)**
```bash
# Stop migration (Ctrl+C)
pnpm payload migrate:reset # Drop new collections
git checkout main # Revert code
# Restore R2 config
```
**Recovery time:** 10-30 minutes  
**Data loss:** Partial uploads (fixable)

**Stage 3: Post-Migration (Live on Vercel Blob)**
```bash
# Quick rollback: Keep both active temporarily
# Add both plugins to payload.config.ts
# Restore database: turso db shell your-db ".restore backup-pre-migration.db"
git push origin main
```
**Recovery time:** 15-30 minutes  
**Data loss:** New uploads since migration

## 7. Documentation Updates

### Documents to Update

**Mark as SUPERSEDED:**
- `docs/plans/2025-10-26-cloudflare-r2-image-storage-design.md`

**Mark as RESOLVED:**
- `docs/plans/2025-11-29-vercel-image-500-investigation.md`
- `docs/plans/2025-11-29-cross-environment-image-serving-design.md`
- `docs/issues.md` (R2 Storage Admin Panel section)
- `docs/R2-MIGRATION-STATUS.md`

**Update:**
- `docs/adr/2025-11-23-database-backup-strategy.md` (cross-reference change)
- `docs/CHANGELOG-2025-11-20-to-2025-11-25.md` (add 2025-11-29 entry)

### New Documentation

**Create ADR:**
- `docs/adr/2025-11-29-storage-migration-vercel-blob.md`

## 8. Rationale & Trade-offs

### Why Vercel Blob?

**Benefits:**
- ✅ Official Payload recommendation for Vercel
- ✅ Fixes admin panel thumbnails (bug #14128)
- ✅ No serverless compatibility issues
- ✅ Free under 100GB (currently ~12.5GB)
- ✅ Simpler architecture (one less service)
- ✅ Fast (Vercel CDN)
- ✅ Unified backup strategy

**Trade-offs:**
- ❌ Need hybrid upload strategy for files >4.5MB
- ❌ Vendor lock-in to Vercel ecosystem
- ❌ Must manage backups to S3 separately

### Cost Analysis

**Current (R2):** ~$0.10/month  
**Future (Vercel Blob):** $0 (under 100GB free tier)  
**Backup (S3):** ~$1-9/month (depending on retention)  
**Net change:** ~$1-9/month increase (acceptable for complexity reduction)

### Why Separate Collections?

**Benefits:**
- Clear domain separation (Images vs Documents)
- Explicit relationships in code
- Different upload optimization (images = thumbnails, documents = raw)
- Better organization in admin panel

**Trade-offs:**
- Migration script complexity (MIME type routing)
- Code updates to reference correct collections
- Two collections to manage instead of one

## 9. Success Criteria

- ✅ All 652 images migrate successfully
- ✅ All PDFs and ZIPs migrate successfully
- ✅ Admin panel thumbnails work
- ✅ No 500 errors on preview deployments
- ✅ Frontend images load from Vercel CDN
- ✅ Documents download correctly
- ✅ Automated backups run successfully
- ✅ Zero downtime during migration
- ✅ All documentation updated

## 10. Related Documents

- [Database Selection ADR](../adr/2025-10-26-database-selection.md)
- [Database Backup Strategy](../adr/2025-11-23-database-backup-strategy.md)
- [Storage Migration ADR](../adr/2025-11-29-storage-migration-vercel-blob.md) (to be created)
- [Vercel Image 500 Investigation](2025-11-29-vercel-image-500-investigation.md) (superseded)
- [Cross-Environment Image Serving](2025-11-29-cross-environment-image-serving-design.md) (superseded)
