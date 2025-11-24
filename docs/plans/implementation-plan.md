# Project-Wide Search - Implementation Plan

**Branch:** `feature/project-wide-search`  
**Design Document:** `2025-11-24-project-wide-search-refined-design.md`  
**Estimated Time:** 3-5 days

## Phase 1: Backend - Payload Search Plugin Setup

### Task 1.1: Install Dependencies
**Estimated Time:** 15 minutes

```bash
pnpm add @payloadcms/plugin-search
```

**Acceptance Criteria:**
- Package installed and in `package.json`
- No build errors after installation

### Task 1.2: Configure Search Plugin
**Estimated Time:** 1 hour

**Files to Modify:**
- `src/payload.config.ts`

**Implementation:**
```typescript
import { searchPlugin } from '@payloadcms/plugin-search'

// Add to plugins array
searchPlugin({
  collections: ['artists', 'employees', 'recordings', 'posts'],
  defaultPriorities: {
    artists: 50,
    recordings: 40,
    posts: ({ doc }) => (doc.categories?.includes('news') ? 30 : 20),
    employees: 15,
  },
  searchOverrides: {
    fields: ({ defaultFields }) => [
      ...defaultFields,
      {
        name: 'locale',
        type: 'select',
        options: ['de', 'en'],
        index: true,
      },
    ],
  },
})
```

**Acceptance Criteria:**
- Plugin configured in `payload.config.ts`
- Dev server starts without errors
- Search collection appears in Payload admin
- Can manually create search records via admin

### Task 1.3: Create Stopword Lists
**Estimated Time:** 30 minutes

**Files to Create:**
- `src/utils/stopwords/de.ts`
- `src/utils/stopwords/en.ts`

**Implementation:**
- German stopwords: der, die, das, und, oder, aber, etc. (~200 words)
- English stopwords: the, an, a, of, and, or, but, etc. (~200 words)
- Export as string arrays

**Acceptance Criteria:**
- Files created with comprehensive stopword lists
- Exported as TypeScript constants
- Unit tests verify lists contain expected words

### Task 1.4: Implement `beforeSync` Hook
**Estimated Time:** 3-4 hours

**Files to Create:**
- `src/hooks/search/beforeSync.ts`
- `src/hooks/search/extractText.ts`
- `src/hooks/search/filterStopwords.ts`
- `src/hooks/search/denormalizeRelationships.ts`

**Implementation Steps:**

1. **Text Extraction (`extractText.ts`):**
   - Parse Lexical JSON richText fields
   - Recursively extract text nodes
   - Concatenate into plain string
   - Handle all node types (paragraph, heading, list, etc.)

2. **Stopword Filtering (`filterStopwords.ts`):**
   - Split text into words
   - Remove words in stopword list (case-insensitive)
   - Rejoin remaining words
   - Preserve word order

3. **Relationship Denormalization (`denormalizeRelationships.ts`):**
   - For Posts: extract artist names from `artists` relationship
   - Append to searchable text
   - Handle both single and array relationships

4. **Main Hook (`beforeSync.ts`):**
   - Determine locale from document or default
   - Extract text from richText fields
   - Filter stopwords based on locale
   - Denormalize relationships
   - Return modified `searchDoc`

**Acceptance Criteria:**
- Hook successfully processes all collection types
- Text extraction works for all Lexical node types
- Stopwords removed correctly per locale
- Artist names included in Post search records
- Unit tests cover all extraction scenarios

### Task 1.5: Seed Static Pages
**Estimated Time:** 1 hour

**Files to Create:**
- `scripts/seedStaticPages.ts`

**Implementation:**
- Manually create search records for:
  - Contact (de + en)
  - Team (de + en)
  - Impressum (de only)
  - Datenschutz (de only)
- Use Payload local API
- Run as seed script

**Acceptance Criteria:**
- Script creates static page records
- Records appear in search collection
- Can run multiple times (idempotent)
- Documented in README

### Task 1.6: Create Search API Endpoint
**Estimated Time:** 2 hours

**Files to Create:**
- `src/app/(payload)/api/search/route.ts`

**Implementation:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const locale = searchParams.get('locale')

  // Validate
  if (!query || query.length < 3) {
    return Response.json({ error: 'Query must be at least 3 characters' }, { status: 400 })
  }

  // Query search collection
  const results = await payload.find({
    collection: 'search',
    where: {
      and: [
        { locale: { equals: locale } },
        { title: { contains: query } }
      ]
    },
    limit: 100,
    sort: '-priority'
  })

  // Group by collection type
  const grouped = groupByType(results.docs)

  return Response.json({
    results: grouped,
    source: 'api'
  })
}
```

**Acceptance Criteria:**
- Endpoint responds to GET requests
- Validates query parameters
- Filters by locale correctly
- Returns grouped results
- Sorts by priority
- Error handling for invalid inputs

---

## Phase 2: Static JSON Backup

### Task 2.1: Create Index Generation Endpoint
**Estimated Time:** 2 hours

**Files to Create:**
- `src/app/(payload)/api/search/generate-index/route.ts`

**Implementation:**
- Query all search records
- Group by locale
- Format as JSON structure per design
- Write to `public/search-index-[locale].json`
- Return success/error response

**Acceptance Criteria:**
- Endpoint generates JSON files on demand
- Files saved to public directory
- JSON structure matches design spec
- Error handling for file system issues

### Task 2.2: Implement Client-Side Fallback
**Estimated Time:** 2 hours

**Files to Modify:**
- `src/services/search.ts` (will create in Phase 3)

**Implementation:**
- Detect API timeout/error
- Fetch static JSON file
- Implement fuzzy search on JSON data
- Return results with `source: 'backup'`

**Acceptance Criteria:**
- Fallback activates on API failure
- Client-side search works correctly
- Returns results in same format as API
- Handles missing/corrupted JSON gracefully

---

## Phase 3: Frontend - Search Service

### Task 3.1: Create Search Service
**Estimated Time:** 3 hours

**Files to Create:**
- `src/services/search.ts`

**Implementation:**
```typescript
// Session cache
const cache = new Map<string, SearchResults>()

// Active request controller
let abortController: AbortController | null = null

export async function searchContent(
  query: string,
  locale: 'de' | 'en'
): Promise<SearchResults> {
  // Validate
  if (query.length < 3 || query.length > 100) {
    throw new Error('Invalid query length')
  }

  // Check cache
  const cacheKey = `${locale}:${query}`
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  // Abort previous request
  if (abortController) {
    abortController.abort()
  }
  abortController = new AbortController()

  try {
    // Try API first (5s timeout)
    const result = await fetchWithTimeout(
      `/api/search?q=${encodeURIComponent(query)}&locale=${locale}`,
      { signal: abortController.signal },
      5000
    )

    cache.set(cacheKey, result)
    return result

  } catch (error) {
    // Fallback to static JSON
    const backupResult = await searchStaticJSON(query, locale)
    cache.set(cacheKey, backupResult)
    return backupResult
  }
}
```

**Acceptance Criteria:**
- Service exports single search function
- Session cache working correctly
- AbortController cancels previous requests
- API timeout triggers fallback
- Fallback to static JSON works
- Unit tests cover all scenarios

### Task 3.2: Create TypeScript Types
**Estimated Time:** 30 minutes

**Files to Create:**
- `src/types/search.ts`

**Implementation:**
```typescript
export interface SearchResult {
  title: string
  slug: string
  doc: string
}

export interface SearchResults {
  results: {
    artists: SearchResult[]
    projects: SearchResult[]
    news: SearchResult[]
    recordings: SearchResult[]
    employees: SearchResult[]
    pages: SearchResult[]
  }
  source: 'api' | 'backup' | 'error'
}
```

**Acceptance Criteria:**
- Types defined for all search-related data
- Exported from central location
- Used throughout codebase

---

## Phase 4: KBar Command Palette

### Task 4.1: Install KBar
**Estimated Time:** 15 minutes

```bash
pnpm add kbar
```

**Acceptance Criteria:**
- Package installed
- Types available (@types/kbar if needed)

### Task 4.2: Create KBar Provider Component
**Estimated Time:** 2 hours

**Files to Create:**
- `src/components/KBar/KBarProvider.tsx`
- `src/components/KBar/useSearchActions.tsx`

**Implementation:**
```typescript
'use client'

import { KBarProvider as BaseKBarProvider, KBarPortal, KBarPositioner, KBarAnimator, KBarSearch, KBarResults } from 'kbar'

export function KBarProvider({ children, locale }: { children: React.ReactNode, locale: 'de' | 'en' }) {
  const actions = useSearchActions(locale)

  return (
    <BaseKBarProvider actions={actions}>
      {children}
      <KBarPortal>
        <KBarPositioner>
          <KBarAnimator>
            <KBarSearch />
            <KBarResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
    </BaseKBarProvider>
  )
}
```

**Acceptance Criteria:**
- Provider wraps app correctly
- KBar opens on cmd-k / ctrl-k
- Modal renders properly
- Styled according to brand

### Task 4.3: Implement Static Navigation Actions
**Estimated Time:** 1 hour

**Files to Modify:**
- `src/components/KBar/useSearchActions.tsx`

**Implementation:**
- Define actions for:
  - Go to Artists
  - Go to Projects
  - Go to News
  - Go to Contact
  - Go to Team
  - Switch locale
- Register with KBar
- Localize labels

**Acceptance Criteria:**
- All navigation actions appear on open
- Actions navigate correctly
- Keyboard shortcuts work
- Labels localized

### Task 4.4: Implement Dynamic Search Results
**Estimated Time:** 3 hours

**Files to Modify:**
- `src/components/KBar/useSearchActions.tsx`

**Implementation:**
- Use `useRegisterActions` hook
- Debounce search (150ms)
- Query search service
- Map results to KBar actions
- Group by section
- Limit to top 5 per section

**Acceptance Criteria:**
- Search results appear as user types (3+ chars)
- 150ms debounce working
- Results grouped by type
- Limited to 5 per section
- Navigation works correctly

### Task 4.5: Create First-Time Tutorial
**Estimated Time:** 2 hours

**Files to Create:**
- `src/components/KBar/Tutorial.tsx`

**Implementation:**
```typescript
'use client'

export function KBarTutorial() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('kbar-tutorial-seen')
    if (!seen) {
      setShow(true)
      setTimeout(() => {
        setShow(false)
        localStorage.setItem('kbar-tutorial-seen', 'true')
      }, 5000)
    }
  }, [])

  if (!show) return null

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-content">
        <p>Press ⌘K (Ctrl+K) anytime to open quick search</p>
        <p>Navigate with arrows ↑↓, select with Enter</p>
        <p>Search anything or use shortcuts to navigate</p>
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- Shows once per user (localStorage)
- Auto-dismisses after 5 seconds
- Dismisses on any interaction
- Localized content
- Styled according to brand

### Task 4.6: Add Search Hint to Header
**Estimated Time:** 1 hour

**Files to Modify:**
- `src/components/Header/Header.tsx`

**Implementation:**
- Add search icon with "Press ⌘K" hint
- Hide after first KBar use
- Show on desktop only

**Acceptance Criteria:**
- Hint visible in header
- Hides after first use
- Not shown on mobile
- Styled appropriately

---

## Phase 5: Dedicated Search Page

### Task 5.1: Create Search Page
**Estimated Time:** 3 hours

**Files to Create:**
- `src/app/(frontend)/[locale]/search/page.tsx`
- `src/components/Search/SearchPage.tsx`
- `src/components/Search/SearchInput.tsx`
- `src/components/Search/SearchResults.tsx`

**Implementation:**
```typescript
// page.tsx (Server Component)
export default async function SearchPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }> 
}) {
  const { locale } = await params
  const { q } = await searchParams

  return <SearchPageClient locale={locale} initialQuery={q} />
}

// SearchPageClient.tsx (Client Component)
'use client'

export function SearchPageClient({ locale, initialQuery }) {
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  // Debounced search (300ms)
  useEffect(() => {
    if (query.length < 3) {
      setResults(null)
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      const data = await searchContent(query, locale)
      setResults(data)
      setLoading(false)

      // Update URL
      window.history.replaceState(null, '', `?q=${encodeURIComponent(query)}`)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, locale])

  return (
    <main>
      <SearchInput value={query} onChange={setQuery} />
      <SearchResults results={results} loading={loading} />
    </main>
  )
}
```

**Acceptance Criteria:**
- Page accessible at `/[locale]/search`
- URL param `?q=` populated
- Input auto-focused
- 300ms debounce working
- Results display correctly

### Task 5.2: Style Search Components
**Estimated Time:** 2 hours

**Files to Modify:**
- `src/components/Search/*.tsx`
- Tailwind classes

**Implementation:**
- Large prominent search input
- Skeleton loaders for results
- Grouped results with section headers
- Empty states styled
- Mobile-responsive

**Acceptance Criteria:**
- Matches brand aesthetic
- Mobile-friendly (touch targets 44px+)
- Loading states clear
- Empty states informative
- Accessible (WCAG AA)

---

## Phase 6: Analytics

### Task 6.1: Create Analytics Endpoint
**Estimated Time:** 1 hour

**Files to Create:**
- `src/app/(payload)/api/analytics/search/route.ts`

**Implementation:**
```typescript
export async function POST(request: Request) {
  const { query, resultsCount, source, locale } = await request.json()

  // Log to file or database
  await logSearchAnalytics({
    query,
    resultsCount,
    source,
    locale,
    timestamp: new Date(),
    zeroResults: resultsCount === 0
  })

  return Response.json({ success: true })
}
```

**Acceptance Criteria:**
- Endpoint accepts POST requests
- Logs anonymously (no user ID)
- Handles errors gracefully
- Fire-and-forget (doesn't block UI)

### Task 6.2: Integrate Analytics Logging
**Estimated Time:** 30 minutes

**Files to Modify:**
- `src/services/search.ts`

**Implementation:**
- After search completes, fire analytics request
- Don't await response
- Catch and suppress errors

**Acceptance Criteria:**
- Analytics logged for all searches
- Doesn't slow down search UX
- Failures don't affect search functionality

### Task 6.3: Update Privacy Policy
**Estimated Time:** 30 minutes

**Files to Modify:**
- `src/app/(frontend)/[locale]/datenschutz/page.tsx`

**Implementation:**
- Add section about search analytics
- Explain what's tracked (queries, no users)
- Mention 90-day retention
- GDPR compliance statement

**Acceptance Criteria:**
- Privacy policy updated
- Clear language
- Both locales updated

---

## Phase 7: Testing & Polish

### Task 7.1: Write Unit Tests
**Estimated Time:** 4 hours

**Files to Create:**
- `src/services/search.spec.ts`
- `src/hooks/search/extractText.spec.ts`
- `src/hooks/search/filterStopwords.spec.ts`
- `src/utils/stopwords/*.spec.ts`

**Test Coverage:**
- Search service caching
- AbortController behavior
- Fallback logic
- Text extraction from Lexical
- Stopword filtering
- Relationship denormalization

**Acceptance Criteria:**
- >80% code coverage
- All edge cases tested
- Tests pass consistently

### Task 7.2: Integration Testing
**Estimated Time:** 2 hours

**Test Scenarios:**
1. Search returns results for all content types
2. Locale filtering works correctly
3. Static pages appear in results
4. Artist names searchable from Posts
5. Stopwords excluded from matches
6. Cache prevents duplicate requests
7. Fallback activates on API failure
8. KBar tutorial shows once
9. Search page URL params work
10. Analytics logging works

**Acceptance Criteria:**
- All scenarios pass
- No console errors
- Performance acceptable (<500ms searches)

### Task 7.3: Accessibility Audit
**Estimated Time:** 2 hours

**Checklist:**
- Keyboard navigation (Tab, Arrow keys, Enter, Esc)
- Screen reader announcements (loading, results, errors)
- Focus management (return focus after close)
- Color contrast (WCAG AA)
- Touch targets (min 44px)
- Reduced motion support
- ARIA labels and roles

**Acceptance Criteria:**
- Passes WCAG 2.1 AA
- Keyboard-only usable
- Screen reader friendly

### Task 7.4: Performance Testing
**Estimated Time:** 1 hour

**Metrics to Check:**
- Search API response time (<200ms target)
- Fallback activation (<500ms target)
- Bundle size impact (<50KB gzipped)
- Session cache effectiveness
- Debounce prevents excessive requests

**Acceptance Criteria:**
- Performance targets met
- No memory leaks
- Reasonable bundle size impact

### Task 7.5: Mobile Testing
**Estimated Time:** 1 hour

**Devices to Test:**
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)

**Test Cases:**
- KBar opens and functions
- Search page works
- Touch targets adequate
- Virtual keyboard doesn't obscure input
- Tutorial shows correctly

**Acceptance Criteria:**
- Works on all tested devices
- UX smooth and intuitive
- No layout issues

---

## Phase 8: Documentation & Deployment

### Task 8.1: Update README
**Estimated Time:** 30 minutes

**Files to Modify:**
- `README.md`

**Add Sections:**
- Search functionality overview
- How to reindex search collection
- Analytics dashboard (future)
- Troubleshooting common issues

**Acceptance Criteria:**
- Clear documentation
- Examples provided
- Links to design doc

### Task 8.2: Create Admin Documentation
**Estimated Time:** 1 hour

**Files to Create:**
- `docs/admin/search-reindexing.md`

**Content:**
- How to use reindex feature
- When to reindex
- How to seed static pages
- Troubleshooting index issues

**Acceptance Criteria:**
- Step-by-step instructions
- Screenshots if helpful
- Clear and actionable

### Task 8.3: Pre-Deployment Checklist
**Estimated Time:** 1 hour

**Checklist:**
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Privacy policy updated
- [ ] Analytics compliant with GDPR
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Mobile tested on real devices
- [ ] Search index seeded
- [ ] Static JSON generated
- [ ] Documentation complete

### Task 8.4: Deploy to Production
**Estimated Time:** 1 hour

**Steps:**
1. Merge feature branch to main
2. Run production build
3. Deploy to Vercel
4. Monitor initial traffic
5. Check analytics logging
6. Verify search working on production

**Acceptance Criteria:**
- Deployment successful
- No production errors
- Search functional
- Analytics logging

### Task 8.5: Post-Deployment Monitoring
**Estimated Time:** Ongoing (first week)

**Monitor:**
- Error logs (search failures)
- Analytics data (query patterns)
- Backup usage frequency
- User feedback
- Performance metrics

**Acceptance Criteria:**
- <5% backup usage
- <20% zero-result rate
- No critical errors
- Positive user feedback

---

## Summary

**Total Estimated Time:** 3-5 days

**Phase Breakdown:**
1. Backend Setup: 8-10 hours
2. Static JSON Backup: 4 hours
3. Search Service: 3.5 hours
4. KBar: 9 hours
5. Search Page: 5 hours
6. Analytics: 2 hours
7. Testing & Polish: 10 hours
8. Documentation & Deployment: 3.5 hours

**Total:** ~44-49 hours (roughly 1 work week at full capacity, or 1.5 weeks at normal pace)

**Critical Path:**
Backend Setup → Search Service → KBar/Search Page (parallel) → Testing → Deploy

**Risk Areas:**
- `beforeSync` hook complexity (Lexical parsing)
- Client-side fallback search performance
- KBar integration edge cases
- Mobile keyboard behavior

**Success Metrics:**
- Search < 200ms API, < 500ms backup
- Zero data leaks
- KBar tutorial completion >80%
- Zero-result rate <20%
- Mobile usability excellent
