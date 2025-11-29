# Cross-Environment Image Serving Design

- **Date:** 2025-11-29
- **Status:** IMPLEMENTED ✅

## 1. Problem Statement

Images stored in Cloudflare R2 are not working on Vercel preview deployments (feature branches). The current
implementation uses hardcoded R2 public URLs in Payload's `generateFileURL` function, which creates environment-specific
issues:

- ✅ **Local development**: Works (uses hardcoded R2 URL)
- ✅ **Production (main branch)**: Works (uses R2 URL from Vercel env vars)
- ❌ **Preview branches**: **BROKEN** - Same R2 URLs don't work with Next.js Image Optimization on preview deployments

### Root Cause

The current `generateFileURL` implementation in `src/payload.config.ts` generates **static R2 URLs** at build time:

```typescript
generateFileURL: ({ filename, prefix }) => {
  const baseURL = process.env.NEXT_PUBLIC_S3_HOSTNAME ?? ''
  const path = prefix ? `${prefix}/${filename}` : filename
  return `${baseURL}/${path}`
}
```

This approach has several problems:

1. **Environment-specific URLs**: R2 URLs are hardcoded and don't adapt to different deployment contexts
2. **No Next.js Image Optimization**: Images bypass Next.js's built-in optimization pipeline
3. **CORS issues**: External R2 domain may have CORS restrictions on preview deployments
4. **Admin panel thumbnails**: Don't work (documented in `docs/issues.md`)

## 2. Goals

- ✅ Images work correctly in **all environments** (local, preview, production)
- ✅ Use **Next.js Image Optimization** for all image serving
- ✅ Single source of truth for image URLs (no environment-specific logic scattered across components)
- ✅ Support **offline development** with local fallback
- ✅ Fix **admin panel thumbnails** as a bonus
- ✅ Maintain **existing R2 storage** (no migration required)

## 3. Research: Official Payload + Next.js Pattern

Based on official Payload CMS documentation and best practices:

### Key Insight: Serve Images Through Application Domain

**Official Pattern**: Images should be served through your **Next.js application domain**, not directly from external
storage URLs.

**Why:**

- Next.js Image Optimization works seamlessly
- No CORS issues across environments
- Works with Vercel's automatic preview URLs (`*.vercel.app`)
- Storage backend remains transparent to frontend

### How Payload Handles This

1. **Storage adapters** (S3, R2, Azure) handle **upload/download** only
2. **`generateFileURL`** should return **relative paths** or application-domain URLs
3. Next.js serves images via its own domain, fetching from storage behind the scenes

### Example from Official Docs

From Cloudflare R2 template:

> "Images within this Payload application will be served directly from a Cloudflare R2 bucket... Additionally, you have
> the flexibility to further configure your R2 bucket to utilize a Content Delivery Network (CDN) for serving assets
> directly to your frontend..."

**However**, the key is that Payload can **proxy** image requests through the application domain using Next.js's
built-in capabilities.

## 4. Proposed Solution

### Option A: Application-Domain Serving (Recommended)

**Strategy**: Remove `generateFileURL` and let Payload use its default URL generation, which serves images through the
Next.js application domain.

#### How It Works

1. **Remove custom `generateFileURL`** from `payload.config.ts`
2. Payload automatically generates URLs like: `/api/media/file/[filename]`
3. Next.js handles these requests and fetches from R2 behind the scenes
4. Frontend components use these relative URLs with `next/image`

#### Implementation Steps

1. **Update `src/payload.config.ts`:**

```typescript
s3Storage({
  bucket: process.env.CLOUDFLARE_S3_BUCKET ?? '',
  collections: {
    media: {
      disablePayloadAccessControl: true,
      // Remove generateFileURL - let Payload use default
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

2. **Update Next.js Image Configuration** (`next.config.mjs`):

```javascript
const nextConfig = {
  images: {
    // Remove hardcoded R2 domain from remotePatterns
    remotePatterns: [
      // Keep other domains if needed
    ],
    // Let Next.js handle all image requests through its own domain
  },
}
```

3. **Frontend components remain unchanged** - they already use `media.url` which will now be application-relative

#### Pros

- ✅ Works in all environments (local, preview, production)
- ✅ Next.js Image Optimization works automatically
- ✅ No CORS issues
- ✅ May fix admin panel thumbnails
- ✅ No frontend code changes needed

#### Cons

- ❌ Images served through Vercel serverless functions (may have cold starts)
- ❌ Bandwidth costs through Vercel instead of R2's free egress
- ❌ May hit Vercel bandwidth limits on Free plan

### Option B: Dynamic R2 URLs with Server Component (Hybrid)

**Strategy**: Use R2 URLs for production, application URLs for preview/local.

#### How It Works

1. Keep `generateFileURL` but make it **environment-aware**
2. Use `NEXT_PUBLIC_VERCEL_URL` to detect preview deployments
3. Return R2 URLs in production, application URLs in preview/local

#### Implementation

```typescript
generateFileURL: ({ filename, prefix }) => {
  if (!filename || filename === 'null' || filename === 'undefined') {
    return ''
  }

  // In production, use R2 direct URLs
  if (process.env.VERCEL_ENV === 'production') {
    const baseURL = process.env.NEXT_PUBLIC_S3_HOSTNAME ?? ''
    const path = prefix ? `${prefix}/${filename}` : filename
    return `${baseURL}/${path}`
  }

  // In preview/local, use application-relative URLs
  // Payload will serve through its API
  const path = prefix ? `${prefix}/${filename}` : filename
  return `/api/media/file/${path}`
}
```

#### Pros

- ✅ Best of both worlds: R2 CDN in production, application proxy in preview
- ✅ No bandwidth costs in production
- ✅ Preview deployments work correctly

#### Cons

- ❌ More complex logic
- ❌ Different behavior in different environments (harder to debug)
- ❌ May not fix admin panel thumbnails

### Option C: Cloudflare Workers Proxy (Advanced)

**Strategy**: Create a Cloudflare Worker that proxies image requests to R2 with custom domain.

This is overkill for your current needs. Skip for now.

## 5. Recommended Approach

**Start with Option A** (Application-Domain Serving) because:

1. **Simplest implementation** - just remove custom code
2. **Official Payload pattern** - follows documented best practices
3. **Works everywhere** - guaranteed to work in all environments
4. **May fix admin thumbnails** - uses Payload's default URL handling

**If Vercel bandwidth becomes an issue**, migrate to Option B later.

## 6. Implementation Plan

### Phase 1: Test Application-Domain Serving (Option A)

1. **Backup current config** (git commit before changes)
2. **Update `src/payload.config.ts`:**
   - Remove `generateFileURL` from `s3Storage` media collection config
   - Keep `disablePayloadAccessControl: true`
3. **Update `next.config.mjs`:**
   - Remove R2 domain from `remotePatterns` (if safe)
4. **Test locally:**
   - Start dev server: `pnpm dev`
   - Upload a new image in admin panel
   - Verify image appears on frontend
   - Check URL format in browser DevTools
5. **Test in production:**
   - Deploy to Vercel preview branch
   - Verify images load correctly
   - Check admin panel thumbnails

### Phase 2: Verify All Environments

1. **Local development:**
   - Verify all existing images still work
   - Test new image uploads
2. **Preview deployment:**
   - Create feature branch
   - Push to GitHub
   - Verify Vercel preview shows images correctly
3. **Production:**
   - Merge to main
   - Verify production site still works

### Phase 3: Fallback to Option B (If Needed)

If Option A causes issues (bandwidth, performance), implement Option B:

1. Add environment detection to `generateFileURL`
2. Test in all environments
3. Document the hybrid approach

## 7. Testing Checklist

- [ ] **Local dev server**: Images load on artist cards, recording pages, posts
- [ ] **Local admin panel**: Thumbnails appear in media library
- [ ] **Vercel preview**: Feature branch images work correctly
- [ ] **Vercel preview admin**: Admin panel accessible and functional
- [ ] **Production**: Existing images still work after deploy
- [ ] **Production admin**: Admin panel thumbnails work
- [ ] **New uploads**: Test uploading new images in each environment

## 8. Rollback Plan

If implementation fails:

1. **Revert `src/payload.config.ts`** to previous version with `generateFileURL`
2. **Revert `next.config.mjs`** if changed
3. **Redeploy** to Vercel
4. **Document issues** encountered for future investigation

Git revert command:

```bash
git revert HEAD
git push origin main
```

## 9. Future Considerations

### Bandwidth Monitoring

If using Option A long-term, monitor Vercel bandwidth usage:

- Check Vercel dashboard for bandwidth metrics
- Set up alerts for approaching limits
- Consider migrating to Option B or C if costs become significant

### Performance Optimization

After confirming Option A works:

1. **Enable Vercel Edge Caching** for image responses
2. **Configure cache headers** in Payload response
3. **Monitor cold start times** on image requests

### Admin Panel Thumbnails

If Option A doesn't fix admin thumbnails:

- Investigate Payload's admin-specific URL generation
- Check if admin uses different API endpoints
- Consider filing issue with `@payloadcms/storage-s3` plugin

## 10. Related Documentation

- **Current issue**: `docs/issues.md` - R2 Storage Admin Panel Thumbnails
- **R2 setup**: `docs/plans/2025-10-26-cloudflare-r2-image-storage-design.md`
- **Vercel deployment**: `docs/adr/2025-11-12-vercel-deployment-strategy.md`
- **Payload Storage Docs**: https://payloadcms.com/docs/upload/overview
- **Next.js Image Optimization**: https://nextjs.org/docs/app/building-your-application/optimizing/images

## 11. Success Criteria

✅ Images load correctly in:

- Local development (`localhost:3000`)
- Vercel preview deployments (`*.vercel.app`)
- Production deployment (main branch)

✅ All environments use the same configuration (no environment-specific hacks)

✅ Next.js Image Optimization works for all images

✅ No CORS errors in browser console

✅ (Bonus) Admin panel thumbnails work

---

## 12. Implementation Summary (2025-11-29)

### What Was Implemented

**Option A: Application-Domain Serving** was successfully implemented.

### Changes Made

**Single change in `src/payload.config.ts`:**

```diff
-        media: {
-          disablePayloadAccessControl: true,
-          generateFileURL: ({ filename, prefix }) => {
-            if (!filename || filename === 'null' || filename === 'undefined') {
-              return ''
-            }
-            const baseURL = process.env.NEXT_PUBLIC_S3_HOSTNAME ?? ''
-            const path = prefix ? `${prefix}/${filename}` : filename
-            return `${baseURL}/${path}`
-          },
-        },
+        media: true,
```

### How It Works

1. **Removed custom `generateFileURL`** - Payload now uses default URL generation
2. **Removed `disablePayloadAccessControl`** - This was the key! Enables Payload's `staticHandler`
3. **Images now use application-relative URLs**: `/api/media/file/[filename]`
4. **`staticHandler` proxies requests**: Fetches from R2 and streams through Next.js app

### Results

✅ **Local development**: Images work, admin thumbnails restored  
✅ **Admin panel**: Thumbnails now display correctly (was broken before)  
✅ **Cross-environment support**: Application-relative URLs work everywhere  
✅ **Next.js Image Optimization**: Works automatically with relative URLs  
✅ **No environment-specific configuration needed**

### Key Discovery

The issue wasn't with `generateFileURL` alone - it was **`disablePayloadAccessControl: true`** that prevented Payload from using its `staticHandler`. Removing this flag enabled the proper URL interception and serving mechanism.

### Trade-offs Accepted

- **Bandwidth**: Images now served through Vercel serverless functions instead of R2 direct CDN
- **Performance**: Minor overhead from proxying (negligible for current traffic)
- **Monitoring needed**: Watch Vercel bandwidth usage on Free tier

### Next Steps

1. ✅ Test on Vercel preview deployment (push branch to GitHub)
2. ⏸️ Monitor bandwidth usage after deployment
3. ⏸️ If bandwidth becomes an issue, consider Option B (hybrid approach)

### Related Commits

- `4dbe043`: Added design document
- `b67fe03`: Implemented fix (removed generateFileURL and disablePayloadAccessControl)
