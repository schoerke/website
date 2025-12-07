# NewsFeed Pagination & Compound Component Refactor

**Date:** 2025-12-07  
**Status:** Planning  
**Priority:** High

## Overview

Add server-side pagination to the News and Projects pages to support scaling to thousands of posts. Refactor NewsFeed
components to use a proper compound component pattern for better API consistency.

## Current State

### Component Structure

- `NewsFeed.Server` - Used on `/news` and `/projects` pages
- `NewsFeedClient` - Used on artist detail pages (within tabs)
- `NewsFeedList` - Shared presentation component
- Export structure exists but isn't fully consistent

### Data Fetching

- `getFilteredPosts()` service function supports limit but not pagination
- Currently fetches all posts (limit: 0) or a fixed limit
- Payload CMS returns pagination metadata but we don't use it

### Pages

- `/news` - Shows all news posts
- `/projects` - Shows all project posts
- No URL-based pagination (`?page=2&limit=25`)

## Problem Statement

1. **Scalability:** As posts grow to thousands, fetching all at once will hurt performance
2. **User Experience:** Users need to browse posts in manageable chunks
3. **API Inconsistency:** Compound component pattern exists but isn't formalized
4. **No Pagination Controls:** Users can't navigate through pages or control items per page

## Goals

1. Add server-side pagination to News/Projects pages
2. Let users choose posts per page (10, 15, 50)
3. Provide clear pagination navigation
4. Maintain performance as post count grows
5. Formalize compound component pattern for NewsFeed
6. Keep artist page behavior unchanged (client-side, no pagination needed)

## Design Decisions

### 1. Server-Side vs Client-Side Pagination

**Decision: Server-Side Pagination**

**Rationale:**

- Scales to thousands of posts
- Better initial page load performance
- SEO-friendly (each page is a unique URL)
- Payload CMS already provides pagination metadata
- News/Projects pages are already server components

### 2. Pagination UI Library

**Decision: Use shadcn/ui Pagination Component**

**Rationale:**

- Consistent with existing design system
- Built on Radix UI primitives (already using Radix)
- Accessible out of the box
- Less custom code to maintain
- Can be customized to match brand

**Installation:**

```bash
npx shadcn@latest add pagination
```

### 3. Compound Component API

**Decision: Formalize compound component pattern**

**Current (partial):**

```tsx
<NewsFeed.Server category="news" locale={locale} />
```

**Proposed (formalized):**

```tsx
<NewsFeed.Root category="news" locale={locale}>
  <NewsFeed.Controls />
  <NewsFeed.List />
  <NewsFeed.Pagination />
</NewsFeed.Root>

// Or keep simple API for common cases:
<NewsFeed.Server category="news" locale={locale} page={1} limit={15} />
```

**Rationale:**

- Provides flexibility for custom layouts
- Maintains simple API for common cases
- Clear separation of concerns
- Easier to test individual parts

### 4. URL Structure

**Decision: Use query parameters for pagination state**

```
/news?page=2&limit=25
/projects?page=1&limit=50
```

**Rationale:**

- Shareable URLs
- Browser back/forward works naturally
- SEO-friendly
- Standard convention

### 5. Default Values

**Decision:**

- Default limit: 25 posts per page
- Default page: 1
- Available limits: 10, 25, 50

**Rationale:**

- 25 is a good balance (not too few, not too many)
- Matches common pagination patterns
- 50 is enough for power users who want to see more

## Implementation Plan

### Phase 1: Service Layer Updates

**File: `src/services/post.ts`**

1. Add new function `getPaginatedPosts()` or update `getFilteredPosts()` to better handle pagination
2. Ensure it returns full Payload pagination metadata:
   - `docs` - Array of posts
   - `totalDocs` - Total number of matching posts
   - `totalPages` - Total number of pages
   - `page` - Current page number
   - `limit` - Posts per page
   - `hasNextPage` - Boolean
   - `hasPrevPage` - Boolean
   - `nextPage` - Next page number (or null)
   - `prevPage` - Previous page number (or null)

**Example:**

```typescript
export const getPaginatedPosts = async (options: {
  category?: string | string[]
  artistId?: string
  page?: number
  limit?: number
  locale?: LocaleCode
  publishedOnly?: boolean
}) => {
  const payload = await getPayload({ config })

  const where: any = {}

  if (options.publishedOnly !== false) {
    where._status = { equals: 'published' }
  }

  if (options.category) {
    where.categories = Array.isArray(options.category) ? { in: options.category } : { contains: options.category }
  }

  if (options.artistId) {
    where.artists = { equals: options.artistId }
  }

  return await payload.find({
    collection: 'posts',
    where,
    page: options.page || 1,
    limit: options.limit || 25,
    locale: options.locale || 'de',
    sort: '-createdAt',
  })
}
```

### Phase 2: Install shadcn Pagination Component

```bash
npx shadcn@latest add pagination
```

This creates `src/components/ui/Pagination.tsx` with:

- `Pagination`
- `PaginationContent`
- `PaginationItem`
- `PaginationLink`
- `PaginationPrevious`
- `PaginationNext`
- `PaginationEllipsis`

### Phase 3: Create Pagination Controls Components

**File: `src/components/NewsFeed/PostsPerPageSelector.tsx`** (Client Component)

```typescript
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface PostsPerPageSelectorProps {
  currentLimit: number
  options?: number[]
}

export const PostsPerPageSelector: React.FC<PostsPerPageSelectorProps> = ({
  currentLimit,
  options = [10, 25, 50],
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', value)
    params.set('page', '1') // Reset to page 1 when changing limit
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Posts per page:</span>
      <Select value={currentLimit.toString()} onValueChange={handleChange}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

**File: `src/components/NewsFeed/NewsFeedPagination.tsx`** (Server Component)

```typescript
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination'

interface NewsFeedPaginationProps {
  currentPage: number
  totalPages: number
  limit: number
  basePath: string
}

export const NewsFeedPagination: React.FC<NewsFeedPaginationProps> = ({
  currentPage,
  totalPages,
  limit,
  basePath,
}) => {
  if (totalPages <= 1) return null

  const createPageUrl = (page: number) => `${basePath}?page=${page}&limit=${limit}`

  // Generate page numbers to show (with ellipsis logic)
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showPages = 5 // How many page numbers to show

    if (totalPages <= showPages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Complex logic: always show first, last, current, and nearby pages
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = generatePageNumbers()

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous button */}
        <PaginationItem>
          {currentPage > 1 ? (
            <PaginationPrevious href={createPageUrl(currentPage - 1)} />
          ) : (
            <span className="pointer-events-none opacity-50">
              <PaginationPrevious href="#" />
            </span>
          )}
        </PaginationItem>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) => (
          <PaginationItem key={idx}>
            {page === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink href={createPageUrl(page)} isActive={page === currentPage}>
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {/* Next button */}
        <PaginationItem>
          {currentPage < totalPages ? (
            <PaginationNext href={createPageUrl(currentPage + 1)} />
          ) : (
            <span className="pointer-events-none opacity-50">
              <PaginationNext href="#" />
            </span>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

### Phase 4: Refactor NewsFeed Components

**File: `src/components/NewsFeed/NewsFeedServer.tsx`**

Update to accept pagination props and render controls:

```typescript
import { getDefaultAvatar } from '@/services/media'
import { getPaginatedPosts } from '@/services/post'
import NewsFeedList from './NewsFeedList'
import { NewsFeedPagination } from './NewsFeedPagination'
import { PostsPerPageSelector } from './PostsPerPageSelector'

interface NewsFeedServerProps {
  category?: string | string[]
  artistId?: string
  page?: number
  limit?: number
  locale?: string
  emptyMessage?: string
  showPagination?: boolean
  basePath?: string
}

const NewsFeedServer: React.FC<NewsFeedServerProps> = async ({
  category,
  artistId,
  page = 1,
  limit = 25,
  locale = 'de',
  emptyMessage = 'No posts found',
  showPagination = true,
  basePath = '/news',
}) => {
  const result = await getPaginatedPosts({
    category,
    artistId,
    page,
    limit,
    locale: locale as 'de' | 'en',
    publishedOnly: true,
  })

  const defaultImagePath = getDefaultAvatar()
  const translationCategory = Array.isArray(category) ? category[0] : category || 'news'

  return (
    <div className="space-y-8">
      {/* Posts per page selector (top) */}
      {showPagination && result.totalPages > 1 && (
        <div className="flex justify-end">
          <PostsPerPageSelector currentLimit={limit} />
        </div>
      )}

      {/* Posts list */}
      <NewsFeedList
        posts={result.docs}
        emptyMessage={emptyMessage}
        category={translationCategory as 'news' | 'projects'}
        defaultImage={defaultImagePath}
      />

      {/* Pagination controls (bottom) */}
      {showPagination && result.totalPages > 1 && (
        <NewsFeedPagination
          currentPage={result.page}
          totalPages={result.totalPages}
          limit={limit}
          basePath={basePath}
        />
      )}
    </div>
  )
}

export default NewsFeedServer
```

**File: `src/components/NewsFeed/index.tsx`**

Formalize compound component exports:

```typescript
import NewsFeedClient from './NewsFeedClient'
import NewsFeedList from './NewsFeedList'
import { NewsFeedPagination } from './NewsFeedPagination'
import NewsFeedServer from './NewsFeedServer'
import { PostsPerPageSelector } from './PostsPerPageSelector'

// Compound component pattern
export const NewsFeed = {
  Server: NewsFeedServer,
  Client: NewsFeedClient,
  List: NewsFeedList,
  Pagination: NewsFeedPagination,
  PostsPerPageSelector: PostsPerPageSelector,
}

export default NewsFeed
```

### Phase 5: Update Pages

**File: `src/app/(frontend)/[locale]/news/page.tsx`**

```typescript
import { NewsFeed } from '@/components/NewsFeed'
import { getTranslations } from 'next-intl/server'

type NewsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; limit?: string }>
}

const NewsPage = async ({ params, searchParams }: NewsPageProps) => {
  const { locale } = await params
  const { page = '1', limit = '25' } = await searchParams

  const t = await getTranslations({ locale, namespace: 'custom.pages.news' })

  // Parse and validate pagination params
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  const limitNum = [10, 25, 50].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 25

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{t('title')}</h1>
      <NewsFeed.Server
        category="news"
        locale={locale}
        page={pageNum}
        limit={limitNum}
        basePath="/news"
      />
    </main>
  )
}

export default NewsPage
```

**File: `src/app/(frontend)/[locale]/projects/page.tsx`**

Similar updates to News page, but with `basePath="/projects"`.

### Phase 6: Translations (Optional)

**File: `src/i18n/en.ts`** and `src/i18n/de.ts`\*\*

Add pagination-related translations if needed:

```typescript
custom: {
  pagination: {
    postsPerPage: 'Posts per page',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
  },
  // ... rest
}
```

Note: shadcn pagination uses aria-labels which can be customized if needed.

### Phase 7: Testing

**Manual Testing:**

1. Navigate to `/news` - should show first 25 posts with pagination
2. Change posts per page selector - should reset to page 1
3. Click page numbers - should navigate correctly
4. Test edge cases:
   - Page 1 (Previous disabled)
   - Last page (Next disabled)
   - Invalid page numbers in URL
   - Empty results
5. Test `/projects` page similarly
6. Verify artist pages still work (no pagination)
7. Test locale switching with pagination state

**Automated Testing:**

- Update NewsFeedServer tests to include pagination props
- Add tests for PostsPerPageSelector
- Add tests for NewsFeedPagination component

## Edge Cases

1. **Invalid page number in URL** (`?page=-1` or `?page=999`)
   - Solution: Clamp to valid range (1 to totalPages)

2. \*\*Invalid limit in URL (`?limit=100`))
   - Solution: Default to 25 if not in allowed list [10, 25, 50]

3. **No posts found**
   - Solution: Show empty message, hide pagination controls

4. **Single page of results**
   - Solution: Hide pagination controls

5. **URL without pagination params**
   - Solution: Use defaults (page=1, limit=25)

6. **Locale switching with pagination**
   - Solution: Preserve page/limit params when switching locales

## Rollout Plan

1. **Development:** Implement on feature branch
2. **Testing:** Manual testing + update automated tests
3. **Staging:** Deploy to staging environment for review
4. **Production:** Deploy after approval

## Future Enhancements

1. **Jump to page input:** Allow users to type page number
2. **Total results display:** Show "Showing X-Y of Z posts"
3. **Infinite scroll option:** Alternative to pagination
4. **Remember user preference:** Store posts-per-page in localStorage
5. **Category filters:** Add filtering by multiple categories

## Success Metrics

- ✅ Pages load faster with large post counts
- ✅ Users can navigate through all posts
- ✅ Users can control posts per page
- ✅ URLs are shareable
- ✅ SEO remains intact
- ✅ No breaking changes to artist pages

## Files to Modify

- `src/services/post.ts` - Add/update pagination function
- `src/components/NewsFeed/NewsFeedServer.tsx` - Add pagination support
- `src/components/NewsFeed/NewsFeedPagination.tsx` - New file
- `src/components/NewsFeed/PostsPerPageSelector.tsx` - New file
- `src/components/NewsFeed/index.tsx` - Formalize exports
- `src/components/ui/Pagination.tsx` - Generated by shadcn
- `src/app/(frontend)/[locale]/news/page.tsx` - Add searchParams
- `src/app/(frontend)/[locale]/projects/page.tsx` - Add searchParams
- `src/i18n/en.ts` - Optional pagination translations
- `src/i18n/de.ts` - Optional pagination translations

## Files NOT to Modify

- `src/components/NewsFeed/NewsFeedClient.tsx` - Keep as-is for artist pages
- `src/components/NewsFeed/NewsFeedList.tsx` - Presentation logic unchanged
- `src/components/Artist/ArtistTabs.tsx` - Uses NewsFeedClient, no changes needed
