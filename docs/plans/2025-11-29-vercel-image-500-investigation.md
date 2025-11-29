# Vercel Preview 500 Error Investigation

**Date:** 2025-11-29
**Status:** INVESTIGATING - NO MORE CODE CHANGES UNTIL ROOT CAUSE IS FOUND

## Problem

After implementing Option A (application-domain serving), images work perfectly locally but return **500 Internal Server Error** on Vercel preview deployment.

### Working

✅ **Local (localhost:3000)**: `/api/media/file/[filename]` returns images correctly  
✅ **Local admin panel**: Thumbnails display correctly

### Not Working  

❌ **Vercel preview**: `https://ks-schoerke-git-fix-images-zeitweb.vercel.app/api/media/file/[filename]` → 500 error

## What We Know

### 1. Configuration Changes Made

**Before:**
```typescript
media: {
  disablePayloadAccessControl: true,
  generateFileURL: ({ filename, prefix }) => {
    const baseURL = process.env.NEXT_PUBLIC_S3_HOSTNAME ?? ''
    const path = prefix ? `${prefix}/${filename}` : filename
    return `${baseURL}/${path}`
  },
}
```

**After:**
```typescript
media: true,  // Simplified - uses Payload's default staticHandler
```

### 2. Environment Variables (Vercel CLI check)

All R2 credentials ARE available on Preview deployments:
- ✅ `CLOUDFLARE_S3_BUCKET` → Preview, Development, Production
- ✅ `CLOUDFLARE_S3_ACCESS_KEY` → Preview, Development, Production  
- ✅ `CLOUDFLARE_SECRET` → Preview, Development, Production
- ✅ `CLOUDFLARE_S3_API_ENDPOINT` → Preview, Development, Production
- ✅ `DATABASE_URI` → Preview, Development, Production
- ✅ `DATABASE_AUTH_TOKEN` → Preview, Development, Production
- ❌ `NEXT_PUBLIC_S3_HOSTNAME` → **Production ONLY** (not Preview)

### 3. How staticHandler Works (from source code)

File: `node_modules/@payloadcms/storage-s3/dist/staticHandler.js`

The `staticHandler`:
1. Receives request at `/api/media/file/[filename]`
2. Constructs S3 key from filename and prefix
3. Calls `getStorageClient().getObject()` to fetch from R2
4. Streams the file back to the client
5. Handles errors with 404 or 500 responses

### 4. API Routes Configuration

- Payload API routes: `src/app/(payload)/api/[...slug]/route.ts`
- This is a catch-all route that handles ALL Payload API endpoints
- Uses `REST_GET(config)` from `@payloadcms/next/routes`
- Should automatically handle `/api/media/file/...` requests

### 5. Vercel Deployment Info

```bash
vercel inspect https://ks-schoerke-git-fix-images-zeitweb.vercel.app
```

- **Status:** Ready
- **Target:** Preview
- **Region:** iad1 (US East)
- **Build includes:** λ api/[...slug] (35.49MB serverless function)

## Hypotheses (Not Yet Tested)

### Hypothesis 1: Serverless Function Timeout

- **Theory:** R2 connection from Vercel serverless function times out
- **Why:** Cold starts + R2 API latency from US East region
- **How to test:** Check Vercel function logs for timeout errors

### Hypothesis 2: Missing Route Registration

- **Theory:** The `staticHandler` route isn't properly registered in Vercel build
- **Why:** Vercel's serverless function bundling might not include the route
- **How to test:** Check if `/api/media/file/` route exists in Vercel build output

### Hypothesis 3: Environment Variable Issue

- **Theory:** Even though env vars exist, they're not accessible in the staticHandler context
- **Why:** Serverless function environment isolation
- **How to test:** Add logging to staticHandler to see what env vars are available

### Hypothesis 4: Database Connection Failure

- **Theory:** Payload tries to verify file access via database, database connection fails
- **Why:** Turso (libsql) connection timeout on cold start
- **How to test:** Check if staticHandler requires database access

### Hypothesis 5: Payload Not Initialized Properly

- **Theory:** `withPayload()` in next.config.mjs doesn't properly initialize on Vercel
- **Why:** Vercel's build/runtime environment differences
- **How to test:** Check Payload initialization logs

### Hypothesis 6: CORS/Network Issue

- **Theory:** Vercel serverless functions can't reach R2 endpoint
- **Why:** Network restrictions or incorrect endpoint URL
- **How to test:** Try direct S3 SDK call from Vercel function

## Official Payload Recommendation (from docs)

> "For Vercel deployment, you get an all-in-one solution with a Next.js frontend, Neon database, and **Vercel Blob for media storage**."

**Key insight:** Payload officially recommends **Vercel Blob**, not S3/R2, for Vercel deployments.

**Why this matters:**
- Vercel Blob is optimized for Vercel's serverless environment
- S3/R2 adapters may have compatibility issues on Vercel
- The `staticHandler` might not be designed for Vercel's specific constraints

## Next Steps (DIAGNOSTIC ONLY)

1. **Get actual error message from Vercel logs**
   - Not the HTTP 500, but the actual error in the serverless function
   - Try: Vercel dashboard → Functions → Recent invocations

2. **Check if this is a known issue**
   - Search Payload GitHub issues for "vercel s3 storage 500"
   - Search for "staticHandler vercel" issues

3. **Test if `generateURL` approach matters**
   - Does setting `disablePayloadAccessControl: false` change behavior?
   - Is there a flag to make `generateURL` return application-relative URLs?

4. **Consider Option B (hybrid)**
   - Use R2 direct URLs on Vercel
   - Use application URLs locally
   - This bypasses the staticHandler on Vercel entirely

5. **Consider switching to Vercel Blob** (if we must use Vercel serverless)
   - Follow official recommendation
   - But this means moving away from R2 (costs money)

## What We Will NOT Do

❌ Make random code changes without understanding the issue  
❌ Try different configurations hoping something works  
❌ Proceed with deployment until we know WHY it's failing

## Related Files

- `src/payload.config.ts` - S3 storage configuration
- `src/app/(payload)/api/[...slug]/route.ts` - Payload API catch-all
- `next.config.mjs` - Next.js configuration with `withPayload()`
- `node_modules/@payloadcms/storage-s3/dist/staticHandler.js` - The handler that's failing

## Related Commits

- `b67fe03` - Implemented simplified configuration (works locally, fails on Vercel)

---

## Update: Vercel Functions Dashboard Shows 0% Error Rate

**Critical Finding:** Vercel Functions dashboard shows **0% error rate**, but browser shows 500 errors.

### What This Means

The 500 error is **NOT** coming from the Payload API serverless function at `/api/media/file/[filename]`.

**Possible causes:**

1. **Next.js Image Optimization (`/_next/image`) is failing**
   - The URL structure: `/_next/image?url=%2Fapi%2Fmedia%2Ffile%2F[filename]`
   - Next.js tries to fetch from `/api/media/file/[filename]`
   - But something fails during the image optimization process

2. **Routing configuration issue**
   - Next.js might not be routing `/api/media/file/` correctly on Vercel
   - Local dev server routes it properly, but Vercel build doesn't

3. **Image loader configuration**
   - Next.js needs the `loader` config to know how to handle relative URLs
   - Without proper loader config, it might fail on Vercel

### Key Insight

The error message URL from the user:
```
https://ks-schoerke-git-fix-images-zeitweb.vercel.app/_next/image?url=%2Fapi%2Fmedia%2Ffile%2FGrubi_slide-1-e1535704350486-768x768.webp&w=3840&q=75
```

This is **Next.js Image Optimization** trying to process the image, not a direct request to the Payload API.

**The flow:**
1. Frontend: `<Image src="/api/media/file/image.webp" />`
2. Next.js converts to: `/_next/image?url=/api/media/file/image.webp`
3. Next.js Image Optimization tries to fetch: `/api/media/file/image.webp`
4. **This step fails with 500 (but Vercel Functions shows no error)**

### New Hypothesis: Remote Pattern Missing

Next.js Image Optimization requires `remotePatterns` or `domains` config for external URLs. But our URLs are **relative** (`/api/media/file/...`), not external.

**Question:** Does Next.js Image Optimization work with relative URLs that point to API routes?

According to Next.js docs, `next/image` can use:
- External URLs (require `remotePatterns`)
- Static imports
- **Local images from public folder**

But **API routes as image sources** might not be officially supported!

### Potential Solution: Custom Loader

We might need a custom image loader that tells Next.js how to handle the `/api/media/file/` URLs.

```typescript
// next.config.mjs
const nextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
  },
}
```

But this is just speculation - we need to confirm what Next.js Image Optimization actually supports.

