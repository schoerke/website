# Server Actions Pattern

This document describes the standard pattern for fetching data in client components using Next.js Server Actions.

## Overview

**Rule:** Always use Server Actions for client component data fetching. Never use REST API fetch() calls.

## Why Server Actions?

- **Better Performance:** Uses Payload's Local API (direct database access) instead of HTTP requests
- **Type Safety:** Full TypeScript types from services
- **Relationship Population:** Easy to use `depth` parameter for nested data
- **Simplified Architecture:** No need to maintain REST API endpoints
- **Next.js Best Practice:** Follows official Next.js 13+ App Router patterns

## Architecture

```
Client Component
    ↓ imports
Server Action (src/actions/)
    ↓ calls
Service Function (src/services/)
    ↓ uses
Payload Local API
    ↓ queries
Database
```

## Implementation Steps

### 1. Create a Server Action

**Location:** `src/actions/[resource].ts`

**Pattern:**

```typescript
'use server'

import { getResourcesByFilter } from '@/services/resource'

/**
 * Server action to fetch resources by filter.
 * Uses Payload Local API for better performance than REST API calls.
 *
 * @param options - Filter options
 * @param options.filterId - Filter by ID (optional)
 * @param options.limit - Maximum results (default: 100)
 * @param options.locale - Locale code (default: 'de')
 * @returns Promise resolving to filtered resources with populated relationships
 *
 * @example
 * // In a client component:
 * const result = await fetchResources({ filterId: '123', locale: 'en' })
 */
export async function fetchResources(options: { filterId?: string; limit?: number; locale?: 'de' | 'en' }) {
  return await getResourcesByFilter({
    filterId: options.filterId,
    limit: options.limit || 100,
    locale: options.locale || 'de',
  })
}
```

**Key Points:**

- Always add `'use server'` directive at the top
- Add comprehensive JSDoc with @example
- Define typed options parameter
- Call existing service functions when possible
- Return full result object (including metadata like totalDocs, hasNextPage)

### 2. Use in Client Component

**Pattern:**

```typescript
'use client'

import { fetchResources } from '@/actions/resources'
import { useEffect, useState } from 'react'

interface ResourceListProps {
  filterId?: string
  locale?: 'de' | 'en'
}

const ResourceList: React.FC<ResourceListProps> = ({ filterId, locale = 'de' }) => {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true)
        const result = await fetchResources({ filterId, locale })
        setResources(result.docs)
      } catch (err) {
        console.error('Failed to fetch resources:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }
    loadResources()
  }, [filterId, locale])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (resources.length === 0) return <div>No resources found</div>

  return (
    <div>
      {resources.map(resource => (
        <div key={resource.id}>{resource.name}</div>
      ))}
    </div>
  )
}

export default ResourceList
```

**Key Points:**

- Import server action at top of file
- Use in useEffect with proper dependency array
- Handle loading, error, and empty states
- Set loading state before and after fetch

### 3. Service Layer with Proper Depth

**Always set appropriate `depth` parameter for relationship population:**

```typescript
// ✅ CORRECT - Populates image relationships
export const getFilteredPosts = async (options: FilterOptions) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: buildWhereClause(options),
    depth: 1, // Populates first level of relationships (images, authors, etc.)
    locale: options.locale || 'de',
  })
}

// ❌ WRONG - Images won't populate, will be IDs only
export const getFilteredPosts = async (options: FilterOptions) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: buildWhereClause(options),
    // Missing depth parameter!
    locale: options.locale || 'de',
  })
}
```

**Depth Guidelines:**

- `depth: 0` (default) - IDs only, no relationship population
- `depth: 1` - Populates first level (e.g., image field becomes full image object)
- `depth: 2` - Populates nested relationships (use sparingly, performance impact)

## Real Examples from This Project

### Example 1: Posts (NewsFeedClient)

**Server Action** (`src/actions/posts.ts`):

```typescript
'use server'

import { getFilteredPosts } from '@/services/post'

export async function fetchPosts(options: {
  category?: string | string[]
  artistId?: string
  limit?: number
  locale?: 'de' | 'en'
}) {
  return await getFilteredPosts({
    category: options.category,
    artistId: options.artistId,
    limit: options.limit || 100,
    locale: options.locale || 'de',
    publishedOnly: true,
  })
}
```

**Client Usage** (`src/components/NewsFeed/NewsFeedClient.tsx`):

```typescript
'use client'

import { fetchPosts } from '@/actions/posts'

const NewsFeedClient: React.FC<Props> = ({ category, artistId, locale }) => {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    async function loadPosts() {
      const result = await fetchPosts({ category, artistId, locale })
      setPosts(result.docs)
    }
    loadPosts()
  }, [category, artistId, locale])

  // Render posts...
}
```

### Example 2: Employees (SearchProvider)

**Server Action** (`src/actions/employees.ts`):

```typescript
'use server'

import { getEmployees } from '@/services/employee'

export async function fetchEmployees(options?: { locale?: 'de' | 'en'; limit?: number }) {
  const result = await getEmployees(options?.locale || 'de')
  const limit = options?.limit || 100
  return {
    ...result,
    docs: result.docs.slice(0, limit),
  }
}
```

**Client Usage** (`src/components/Search/SearchProvider.tsx`):

```typescript
'use client'

import { fetchEmployees } from '@/actions/employees'

const DynamicSearchActions = () => {
  const [allEmployees, setAllEmployees] = useState([])

  useEffect(() => {
    async function fetchAllEmployees() {
      try {
        const result = await fetchEmployees({ locale, limit: 100 })
        const employees = result.docs
          .filter((emp) => emp.email)
          .map((emp) => ({ id: emp.id, name: emp.name, email: emp.email }))
        setAllEmployees(employees)
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      }
    }
    fetchAllEmployees()
  }, [locale])

  // Use employees for search...
}
```

### Example 3: Recordings (ArtistTabs)

**Server Action** (`src/actions/recordings.ts`):

```typescript
'use server'

import { getRecordingsByArtist } from '@/services/recording'

export async function fetchRecordingsByArtist(options: { artistId: string; locale?: 'de' | 'en' }) {
  return await getRecordingsByArtist({
    artistId: options.artistId,
    locale: options.locale || 'de',
  })
}
```

**Client Usage** (`src/components/Artist/ArtistTabs.tsx`):

```typescript
'use client'

import { fetchRecordingsByArtist } from '@/actions/recordings'

const ArtistTabs: React.FC<Props> = ({ artistId, locale }) => {
  const [recordings, setRecordings] = useState([])

  // Lazy load recordings when tab is clicked
  const handleTabChange = async (tab: string) => {
    if (tab === 'discography' && recordings.length === 0) {
      const result = await fetchRecordingsByArtist({ artistId, locale })
      setRecordings(result.docs)
    }
  }

  // Render tabs...
}
```

## When to Use Server Actions

✅ **Always use server actions for:**

- Client components fetching data on mount
- Lazy-loaded data (tabs, accordions, infinite scroll)
- Form submissions
- Any data operation from a client component

❌ **Never use REST API fetch() for:**

- Data fetching in client components
- Relationship queries requiring `depth` parameter
- Operations that could use Local API

## Migration Checklist

When converting REST API calls to server actions:

1. ✅ Create server action in `src/actions/[resource].ts`
2. ✅ Add comprehensive JSDoc with @example
3. ✅ Import and call existing service functions
4. ✅ Add `depth` parameter to service if relationships need population
5. ✅ Update client component to use server action
6. ✅ Remove REST API endpoint if no longer needed
7. ✅ Update tests to mock server action instead of fetch()
8. ✅ Verify relationship data populates correctly
9. ✅ Test loading, error, and empty states

## Before & After Comparison

### Before (REST API - DON'T DO THIS)

```typescript
// ❌ Client component using REST API
const res = await fetch(`/api/employees?locale=${locale}&limit=100`)
if (!res.ok) throw new Error('Failed to fetch')
const data = await res.json()
const employees = data.docs
```

**Problems:**

- Manual URL construction (error-prone)
- No type safety
- Requires REST API endpoint maintenance
- Can't easily populate relationships
- Less performant (HTTP overhead)

### After (Server Action - CORRECT)

```typescript
// ✅ Client component using Server Action
import { fetchEmployees } from '@/actions/employees'
const result = await fetchEmployees({ locale, limit: 100 })
const employees = result.docs
```

**Benefits:**

- No URL construction
- Type-safe parameters and response
- Uses Payload Local API (direct database access)
- Easy to add `depth` for relationships
- Automatic error handling
- Better performance

## Testing

When testing components that use server actions, mock the action:

```typescript
import { fetchPosts } from '@/actions/posts'
import { render, waitFor } from '@testing-library/react'

// Mock the server action
vi.mock('@/actions/posts', () => ({
  fetchPosts: vi.fn(),
}))

describe('NewsFeedClient', () => {
  it('should fetch and display posts', async () => {
    // Arrange
    const mockPosts = { docs: [{ id: '1', title: 'Test Post' }], totalDocs: 1 }
    vi.mocked(fetchPosts).mockResolvedValue(mockPosts)

    // Act
    const { getByText } = render(<NewsFeedClient category="news" locale="en" />)

    // Assert
    await waitFor(() => {
      expect(fetchPosts).toHaveBeenCalledWith({ category: 'news', locale: 'en' })
      expect(getByText('Test Post')).toBeInTheDocument()
    })
  })
})
```

## Related Documentation

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Payload Local API](https://payloadcms.com/docs/local-api/overview)
- See `AGENTS.md` for component patterns and coding standards
- See `docs/components.md` for component architecture
