# Performance Optimizations

## Image Loading Performance

### Current Status (2025-11-30)

Images are currently served through Payload API endpoints (`/api/images/file/{filename}`), which adds latency:

- Each image request hits a Next.js serverless function
- Function queries database → fetches from Vercel Blob → serves to client
- This works but is slower than direct CDN access

### Recommended Optimizations

#### 1. Enable Next.js Image Optimization (High Priority)

**Benefits:**

- Automatic image optimization and resizing
- Lazy loading out of the box
- Caching on Vercel Edge CDN after first request
- Significant performance improvement with minimal code changes

**Implementation:**

Replace standard `<img>` tags with Next.js `<Image>` component:

```tsx
import Image from 'next/image'

// Before
<img src={imageUrl} alt="Artist photo" />

// After
<Image
  src={imageUrl}
  width={800}
  height={600}
  alt="Artist photo"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

**Configuration in `next.config.mjs`:**

```javascript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
}
```

**Files to Update:**

- `src/components/Artist/ArtistCard.tsx`
- `src/components/NewsFeed/NewsFeedList.tsx`
- `src/app/(frontend)/[locale]/news/[slug]/page.tsx`
- `src/app/(frontend)/[locale]/projects/[slug]/page.tsx`
- `src/app/(frontend)/[locale]/team/page.tsx`
- `src/components/Footer/FooterLogo.tsx`

**Resources:**

- [Next.js Image Optimization Docs](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Image Component API](https://nextjs.org/docs/app/api-reference/components/image)

---

#### 2. ✅ COMPLETE - Move Large ZIP Files to Cloudflare R2 (2025-12-10)

**Issue (Discovered 2025-11-30):**

- Vercel Blob has 10GB/month bandwidth limit on free tier
- 21 ZIP files (artist photo galleries) = 721.93 MB
- Each ZIP is 40-60 MB
- ~12 full downloads of all galleries would exhaust monthly limit

**Solution Implemented:**

- Dual storage architecture (see ADR 2025-12-10-dual-storage-r2-vercel-blob.md)
- **Images** (JPG, PNG, WEBP) → Vercel Blob (Next.js optimization)
- **Documents** (ZIPs, PDFs) → Cloudflare R2 (unlimited bandwidth)

**Results:**

- 45 documents migrated to R2 (22 ZIPs + 23 PDFs)
- 721.93 MB no longer counts against Vercel Blob bandwidth
- Zero monthly cost (under both free tiers)
- Downloads verified working

**Storage Cost Comparison:**

- **Vercel Blob:** $0.15/GB storage, 10GB/month bandwidth (free tier)
- **Cloudflare R2:** $0.015/GB storage, **unlimited egress bandwidth**

**ROI:** For ~700MB of ZIPs with frequent downloads, R2 eliminates bandwidth constraints entirely.

---

#### 3. Add Responsive Image `sizes` Prop (Low Priority)

**Benefits:**

- Browser downloads appropriately sized images for viewport
- Reduces bandwidth usage on mobile devices
- Improves page load performance

**Implementation:**

```tsx
<Image
  src={imageUrl}
  width={1200}
  height={800}
  alt="..."
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

**Common Patterns:**

- Full-width hero images: `sizes="100vw"`
- Grid items (3 columns): `sizes="(max-width: 768px) 100vw, 33vw"`
- Sidebar images: `sizes="(max-width: 768px) 100vw, 25vw"`

---

#### 4. Consider Static Image Imports for Core Assets (Low Priority)

For frequently used core assets (logo, logo_icon, default-avatar), consider using static imports:

```tsx
import logo from '@/assets/logo.png'
;<Image src={logo} alt="Logo" />
```

**Benefits:**

- No runtime fetches for core assets
- Optimized at build time
- Better performance for critical UI elements

**Note:** This would require keeping core assets in the repository, contrary to current Vercel Blob approach. Evaluate
trade-offs.

---

## Monitoring

### Vercel Blob Usage

Check bandwidth usage regularly:

```bash
pnpm tsx tmp/analyzeBlobUsage.ts
```

Current status (2025-11-30):

- 866 MB / 10 GB bandwidth used (8.6%)
- 139 files, 731.55 MB total
- ZIPs: 721.93 MB (99% of storage)
- Images: ~8 MB
- PDFs: ~4 MB

### Performance Metrics to Track

- Time to First Byte (TTFB) for image requests
- Largest Contentful Paint (LCP) - should be <2.5s
- Total bandwidth usage per month
- Image cache hit rate on Vercel Edge

---

## Implementation Priority

**Phase 1 (High Impact, Low Effort):**

1. ✅ Enable Next.js Image component for all images
2. ✅ Add responsive `sizes` props

**Phase 2 (High Impact, Medium Effort):**

3. ✅ **COMPLETE (2025-12-10)** - Move ZIP files to Cloudflare R2
   - **Status:** Dual storage architecture implemented
   - **Images:** Vercel Blob (Next.js optimization)
   - **Documents:** Cloudflare R2 (unlimited bandwidth)
   - **Migration:** 45 documents (22 ZIPs + 23 PDFs) migrated to R2
   - **Bandwidth:** 721.93 MB of ZIPs no longer count against Vercel Blob limit
   - **See:** `docs/adr/2025-12-10-dual-storage-r2-vercel-blob.md`

**Phase 3 (Nice to Have):** 4. Consider static imports for core assets (evaluate trade-offs)

---

**Last Updated:** 2025-11-30
