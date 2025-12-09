# Known Issues

## News Feed Pagination Fade-In Animation

**Status**: UNRESOLVED (as of 2025-12-08)

**Issue**: When changing posts-per-page selector (e.g., 25 → 50), the news feed list does not animate/fade-in smoothly.
The content just appears instantly, creating a jarring user experience.

**Root Cause**: Next.js App Router uses "soft navigation" (client-side transitions) that preserve and update React
components in place rather than unmounting/remounting them. Search param changes explicitly do NOT trigger component
remounts in Next.js.

### Attempted Solutions (All Failed)

1. **CSS `animate-fade-in` class with `key` prop**
   - Result: ❌ Does not work because Next.js streams updates to client components via props, not unmount/remount
   - The `key` prop on client components inside server components doesn't force remount during RSC streaming

2. **JavaScript `useEffect` with animation restart**
   - Result: ❌ Does not reliably trigger because DOM elements are reused, and force reflow timing is unreliable

3. **CSS View Transitions API (`@view-transition { navigation: auto; }`)**
   - Result: ❌ Does not work (reason unclear - may be browser support, Next.js version, or implementation issue)
   - Should theoretically work with Chrome 126+, Safari 18.2+, but didn't trigger in testing

4. **`useSearchParams()` with state-based animation key**
   - Result: ❌ Not tested due to time constraints

### Technical Context

- **Architecture**: Next.js 15 App Router with React Server Components
- **Component hierarchy**:
  - `page.tsx` (Server) → `<Suspense>` → `NewsFeed.Server` (Server) → `NewsFeedList` (Client)
- **Navigation**: Changes URL search params via `router.push()`
- **Problem**: Next.js explicitly states "search params do not trigger remounts" (from template.tsx docs)

### Current State

- Code has been reverted to simplest form: no animations
- Skeleton loader shows during navigation (good UX)
- View Transitions CSS remains in `globals.css` but doesn't trigger
- All 148 tests passing

### Potential Future Solutions

1. **Test View Transitions API in isolation** - Create minimal reproduction outside of project to verify browser support
2. **Use `useSearchParams()` + state** - Detect param changes client-side and force animation via state update
3. **Client-side pagination** - Move pagination to client-side to avoid RSC navigation issues (major refactor)
4. **Accept no animation** - Skeleton loader may be sufficient UX

### Files Involved

- `src/app/(frontend)/globals.css` - Contains View Transitions CSS (not working)
- `src/components/NewsFeed/NewsFeedList.tsx` - List component (no animation code currently)
- `src/components/NewsFeed/NewsFeedServer.tsx` - Server component wrapper
- `src/app/(frontend)/[locale]/news/page.tsx` - News page with Suspense
- `src/app/(frontend)/[locale]/projects/page.tsx` - Projects page with Suspense

### Related Documentation

- Next.js App Router navigation: <https://nextjs.org/docs/app/getting-started/linking-and-navigating>
- View Transitions API: <https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API>
- React state preservation: <https://react.dev/learn/preserving-and-resetting-state>

---

_No other known issues at this time._

---

## Resolved Issues

### R2 Storage Admin Panel Thumbnails (RESOLVED - Migrated to Vercel Blob)

**Status**: RESOLVED (2025-11-30) - Migrated to Vercel Blob storage **Previous Status**: UNRESOLVED (as of 2025-11-27)

**Resolution**: We migrated from Cloudflare R2 to Vercel Blob storage, which resolved the admin panel thumbnail issues.
Vercel Blob has native Payload CMS integration with proper admin panel support.

See: `docs/adr/2025-11-29-storage-migration-vercel-blob.md`

---

**Last Updated**: 2025-12-08
