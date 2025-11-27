# Known Issues

## R2 Storage Admin Panel Thumbnails Not Working

**Status**: UNRESOLVED (as of 2025-11-27) **Severity**: Medium (admin UX issue, does not affect public site)
**Affects**: Payload CMS admin panel only

### Problem

Admin panel does not display thumbnails for media uploaded to Cloudflare R2 storage. Media files work correctly on the
public-facing site.

### Investigation History (2025-11-27)

#### What We Tried

1. **Initial hypothesis**: `disablePayloadAccessControl: true` was needed
   - **Result**: Did NOT fix thumbnails despite documentation suggesting it would
   - **Commit**: 54792b7 (had this flag, thumbnails still broken)

2. **Simplified configuration attempt**
   - Removed `disablePayloadAccessControl: true`
   - Simplified `generateFileURL` logic
   - **Result**: Thumbnails still broken, no change observed
   - **Commits**: 61f26b9, 3e0363e, 3d9e54b
   - **Reverted**: bf10f46 (current state)

3. **Database cleanup**
   - Fixed 64 media records with `/null` URLs caused by migration script bug
   - **Result**: Public site images work correctly
   - **Commit**: 54792b7

#### What Actually Works

- ✅ Public site images load correctly from R2
- ✅ No `/null` URL strings in production
- ✅ R2 URLs are properly formatted: `https://pub-[id].r2.dev/[filename]`
- ✅ Image upload to R2 works
- ✅ Image generation (sizes) works

#### What Doesn't Work

- ❌ Admin panel thumbnails (all sizes)
- ❌ Admin panel media library preview images

### Current Configuration

**File**: `src/payload.config.ts` (lines 129-159)

```typescript
s3Storage({
  bucket: process.env.CLOUDFLARE_S3_BUCKET ?? '',
  collections: {
    media: {
      disablePayloadAccessControl: true,
      generateFileURL: ({ filename, prefix }: { filename: string; prefix?: string }) => {
        if (!filename || filename === 'null' || filename === 'undefined') {
          return ''
        }
        const baseURL = process.env.NEXT_PUBLIC_S3_HOSTNAME ?? ''
        const path = prefix ? `${prefix}/${filename}` : filename
        return `${baseURL}/${path}`
      },
    },
  },
  config: {
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_S3_ACCESS_KEY ?? '',
      secretAccessKey: process.env.CLOUDFLARE_SECRET ?? '',
    },
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_S3_API_ENDPOINT ?? '',
    forcePathStyle: true,
  },
})
```

**Media Collection**: `src/collections/Media.ts`

- Has `read: () => true` (public access)
- Upload configured for R2

### Unverified Hypotheses

1. **CORS issue**: R2 bucket may need CORS headers for admin panel origin
2. **CSP issue**: Content Security Policy may block R2 domain in admin context
3. **Admin panel proxy issue**: Payload admin may expect different URL format
4. **Authentication headers**: Admin requests may include auth headers that R2 rejects
5. **Vercel serverless function timeout**: Thumbnail requests may be timing out
6. **Plugin bug**: `@payloadcms/storage-s3` may have admin panel compatibility issue

### Related Files

- `src/payload.config.ts` - R2 storage configuration
- `src/collections/Media.ts` - Media collection with upload settings
- `scripts/db/migrateMediaToR2.ts` - Migration script (fixed null filename bug)
- `.env.vercel` - R2 environment variables

### Environment Variables

```bash
CLOUDFLARE_S3_BUCKET=ks-schoerke-media
CLOUDFLARE_S3_API_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
CLOUDFLARE_S3_ACCESS_KEY=[key]
CLOUDFLARE_SECRET=[secret]
NEXT_PUBLIC_S3_HOSTNAME=https://pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev
```

### Next Steps for Investigation

When revisiting this issue:

1. **Check browser console** in admin panel when viewing media
   - Look for CORS errors
   - Look for CSP violations
   - Look for 403/404 errors
   - Check actual URLs being requested

2. **Check R2 bucket CORS settings**
   - May need to allow admin panel origin
   - Check if OPTIONS requests are failing

3. **Test with different storage adapter**
   - Try Vercel Blob or S3 temporarily to verify it's R2-specific

4. **Check Payload logs**
   - See if there are errors when generating thumbnail URLs
   - Check if `generateFileURL` is being called for admin context

5. **Review `@payloadcms/storage-s3` plugin source**
   - GitHub: <https://github.com/payloadcms/payload/tree/main/packages/storage-s3>
   - Check if there are known issues with admin panel
   - Look for admin-specific URL generation logic

6. **Test `disableLocalStorage` option**
   - Plugin has `disableLocalStorage` option (not documented well)
   - May affect how admin panel serves thumbnails

### Workarounds

**Current**: Live with no thumbnails in admin panel (annoying but functional)

**Alternative**: Switch to Vercel Blob storage (costs money, may work better)

### References

- Payload Storage S3 Plugin: <https://payloadcms.com/docs/upload/overview>
- Cloudflare R2 Docs: <https://developers.cloudflare.com/r2/>
- Related commit range: 54792b7...bf10f46

---

**Last Updated**: 2025-11-27 **Reporter**: User (via agent session) **Impact**: Admin UX degradation, public site
unaffected
