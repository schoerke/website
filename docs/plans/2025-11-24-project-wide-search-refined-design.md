# Project-Wide Search - Refined Design

**Date:** 2025-11-24 **Status:** ✅ Implemented (KBar Phase Complete) **Architecture:** Hybrid - Payload Search Plugin +
Static JSON Backup

## Current Implementation Status

### ✅ What's Working (Phase 1-4 Complete)

**KBar Command Palette:**

- Opens with `cmd+k` (Mac) or `ctrl+k` (Windows/Linux)
- 6 static navigation actions always visible
- Dynamic search results appear as you type (3+ character minimum)
- Clean display titles: "Mario Venzago" instead of full biography text
- Locale-aware: English content when searching in English, German when in German
- Proper keyboard navigation with arrow keys and Enter to select

**Backend:**

- Payload Search Plugin configured and operational
- Search collection with `displayTitle` field for clean UI display
- `beforeSyncHook` extracts text, filters stopwords, and populates both:
  - `title`: Full searchable content (biography, etc.)
  - `displayTitle`: Clean document name for display
- Search API endpoint: `GET /api/search?q=<query>&locale=<locale>`
- Locale filtering works via `search_locales` table

**Search Service:**

- Client-side service handles API calls
- 150ms debouncing for snappy keyboard-driven experience
- Returns clean titles for display in KBar

### 🔄 What's Next (Phase 5+)

- Static JSON backup for offline resilience
- Dedicated search page (`/[locale]/search`)
- First-time tutorial overlay
- Header search icon/trigger
- Session-based caching to prevent duplicate API calls
- Mobile optimizations
- Search analytics

### 📋 Files Modified/Created

**Configuration:**

- `src/payload.config.ts` - Added `displayTitle` field to search plugin

**Backend:**

- `src/utils/search/beforeSyncHook.ts` - Populates displayTitle + searchable content
- `src/app/api/search/route.ts` - Search API endpoint returning displayTitle

**Frontend:**

- `src/components/Search/SearchProvider.tsx` - KBar provider and dynamic actions
- `src/services/search.ts` - Search service layer

**Utilities:**

- `src/utils/search/extractLexicalText.ts` - Extract text from Lexical richText
- `src/utils/search/filterStopwords.ts` - Remove stopwords by locale
- `src/utils/stopwords/de.ts` - German stopword list
- `src/utils/stopwords/en.ts` - English stopword list

## Overview

Implement a fast, resilient, mobile-friendly search feature that allows users to search across all public content via
both a dedicated search page and a cmd-k style command palette (KBar). The search uses the official Payload CMS Search
Plugin as the primary backend, with a static JSON backup for resilience during API downtime.

## Content Scope

### Indexed Collections

- **Artists** (priority: 50)
- **Recordings** (priority: 40)
- **Posts - News category** (priority: 30)
- **Posts - Projects category** (priority: 20)
- **Employees** (priority: 15)
- **Static Pages** (Contact, Team, Impressum, Datenschutz) - manually seeded

### Excluded Collections

- **Media** - Not destination content; discovered through parent content
- **Users** - Internal only, never searchable
- **NewsletterContacts** - Private data, never searchable

### Localization Strategy

- **Locale-scoped search:** Search only current locale's content
- Separate result sets per locale (`/de/search` vs `/en/search`)
- Static pages and non-localized content (Artists, Employees) appear in both locales
- Result URLs always include locale prefix

## Backend Architecture

### 1. Payload Search Plugin Configuration

**Installation:**

```bash
pnpm add @payloadcms/plugin-search
```

**Plugin Setup (`payload.config.ts`):**

```typescript
import { searchPlugin } from '@payloadcms/plugin-search'

plugins: [
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
  }),
]
```

### 2. Field Indexing via `beforeSync` Hook

The `beforeSync` hook processes each document before indexing:

**Display Title Field:**

- **`displayTitle`**: Clean document name for display purposes
  - Artists: `doc.name` (e.g., "Mario Venzago")
  - Posts: `doc.title`
  - Recordings: `doc.title`
  - Employees: `"${firstName} ${lastName}"`
- **`title`**: Full searchable content (biography, post content, etc.) with stopwords filtered
- This separation ensures clean UI display while maintaining comprehensive search functionality

**Text Extraction:**

- Extract plain text from Lexical richText fields (Posts.content, Recordings.description, Artists.biography)
- Convert Lexical JSON to plain text string

**Stopword Filtering:**

- Apply German stopword list for `locale: 'de'`
- Apply English stopword list for `locale: 'en'`
- Remove common filler words: "the", "an", "of", "der", "die", "das", etc.
- Retain meaningful content words only

**Relationship Denormalization:**

- Include related artist names in Post search records
- Example: Post about "Maria Schmidt" includes her name in searchable text even if only mentioned via relationship

**Static Page Seeding:**

- Manually create search records for non-CMS pages:
  - Contact (both locales)
  - Team (both locales)
  - Impressum (German only)
  - Datenschutz (German only)

**Data Storage:**

- Store: `title` (searchable content), `displayTitle` (clean name), `doc` (ID), `locale`, `priority`
- No images, no full content, no unnecessary metadata
- Keeps search collection small and queries fast

### 3. API Endpoint

**Route:** `/api/search`

**Query Parameters:**

- `q` - Search query (required, min 3 chars, max 100 chars)
- `locale` - Current locale (required: 'de' or 'en')

**Response Format:**

```typescript
{
  results: {
    artists: Array<{ title: string, slug: string, doc: string }>,
    projects: Array<{ title: string, slug: string, doc: string }>,
    news: Array<{ title: string, slug: string, doc: string }>,
    recordings: Array<{ title: string, slug: string, doc: string }>,
    employees: Array<{ title: string, slug: string, doc: string }>,
    pages: Array<{ title: string, slug: string, doc: string }>
  },
  source: 'api' | 'backup'
}
```

**Implementation:**

- Query Payload's `search` collection
- Filter by `locale` parameter
- Group results by collection/category
- Sort by `priority` field (higher = first)

### 4. Static JSON Backup

**Purpose:** Provide resilience when Payload API is unavailable or slow

**Generation Strategy:**

- **Trigger:** On-demand via `/api/search/generate-index`
- **Timing:** First request after deploy, cached in memory
- **Output:** `public/search-index-[locale].json` (one file per locale)

**File Structure:**

```json
{
  "version": "2025-11-24",
  "locale": "de",
  "updated": "2025-11-24T10:30:00Z",
  "results": {
    "artists": [{ "title": "...", "slug": "...", "doc": "..." }],
    "projects": [...],
    "news": [...],
    "recordings": [...],
    "employees": [...],
    "pages": [...]
  }
}
```

**Fallback Logic:**

1. Frontend attempts Payload API first (5-second timeout)
2. On error/timeout: fetch static JSON file
3. Perform client-side fuzzy search on JSON data
4. Display results with indicator: "Searching offline backup"

## Frontend Architecture

### 1. Search Service Layer

**Location:** `src/services/search.ts`

**Responsibilities:**

- Single source of truth for all search queries
- Session-based caching (in-memory Map)
- Request deduplication via AbortController
- Automatic API → backup fallback

**Key Function:**

```typescript
async function searchContent(query: string, locale: 'de' | 'en'): Promise<SearchResults>
```

**Query Flow:**

1. Validate query (3-100 chars, sanitize)
2. Check session cache for `${locale}:${query}`
3. Abort any pending request for same locale
4. Try Payload API with 5-second timeout
5. On success: cache result, return
6. On failure: fetch static JSON, search client-side
7. Cache result and return
8. On total failure: return empty with error flag

**Cache Strategy:**

- Session-scoped (lasts entire browser session)
- Keyed by `${locale}:${query}`
- No cache invalidation needed (session ends on tab close)

### 2. KBar Command Palette

**Library:** `kbar` - `pnpm add kbar`

**Provider Setup:**

- Wrap root layout with `<KBarProvider>`
- Register global cmd-k (Mac) / ctrl-k (Windows/Linux) listener

**Action Types:**

**A) Static Navigation Actions** (shown immediately):

- "Go to Artists"
- "Go to Projects"
- "Go to News"
- "Go to Contact"
- "Go to Team"
- "Switch to English/Deutsch"

**B) Dynamic Search Results** (appear as user types, 3+ chars):

- Grouped by type: Artists, Projects, News, Recordings, Employees, Pages
- Section headers for each group
- Results prioritized by plugin priority field
- Limit: Top 5 per section (max 30 total)

**Behavior:**

- Debounce: 150ms (snappy for keyboard-driven use)
- Min 3 characters before searching
- Arrow keys navigate, Enter selects, Esc closes
- Auto-focus input on open

**Mobile Adaptation:**

- Full-screen modal
- Touch-friendly targets (min 44px)
- Slide-up animation from bottom

**First-Time Tutorial:**

- Show once per user (localStorage: `kbar-tutorial-seen`)
- 3 quick tips:
  1. "Press ⌘K (Ctrl+K) anytime to open quick search"
  2. "Navigate with arrows ↑↓, select with Enter"
  3. "Search anything or use shortcuts to navigate"
- Auto-dismiss after 5 seconds or on any interaction
- Localized (German/English)

**Ongoing Hint:**

- Show "Press ⌘K to search" in header/footer until first use
- Subtle keyboard icon with shortcut text

### 3. Dedicated Search Page

**Route:** `/[locale]/search`

**UI Components:**

- Large, prominent search input (auto-focused)
- URL param: `?q=query` (shareable/bookmarkable)
- Skeleton loaders during query
- Results grouped by type with section headers
- Simple list items: title + link (minimal design)
- Empty states:
  - No query: "Search for artists, recordings, news..."
  - Too short: "Type at least 3 characters"
  - No results: "No results found for '[query]'"
  - Error: "Search temporarily unavailable. Please try again."

**Behavior:**

- Debounce: 300ms (more relaxed than KBar)
- Min 3 characters before searching
- AbortController cancels previous requests
- Session cache shared with KBar
- Results update in real-time as user types

**Mobile Optimizations:**

- Sticky search input at top
- Large touch targets (min 44px)
- Reduced motion for accessibility
- Virtual keyboard-friendly

**SEO:**

- Page title: "Search - Schoerke" (localized)
- Meta description explaining search functionality
- `robots: noindex` (don't index search results)

### 4. Header Integration

Add search trigger to site header:

- Icon: Magnifying glass with "Search" label
- Desktop: Shows cmd-k/ctrl-k hint
- Mobile: Opens KBar on tap
- Click opens KBar, keyboard shortcut also works

## Performance & Caching

### Debounce Timing

- **KBar:** 150ms (snappy for power users)
- **Search Page:** 300ms (more relaxed)

### Caching Strategy

- **Session-based cache:** Lasts entire browser session
- **Key format:** `${locale}:${query}`
- **Storage:** In-memory Map (no localStorage)
- **Shared:** Same cache for KBar and search page
- **No invalidation:** Cache clears on session end

### Request Management

- **AbortController:** Cancel in-flight requests when new query starts
- **Only latest search completes:** Prevents race conditions
- **Timeout:** 5 seconds before fallback to static JSON

## Error Handling & Edge Cases

### Query Validation

- Minimum: 3 characters (enforced client-side)
- Maximum: 100 characters (truncate with warning)
- Sanitize special characters (prevent injection)
- Trim whitespace

### Network Errors

- API timeout: 5 seconds → fallback to static JSON
- Network offline: Immediate fallback
- JSON parse errors: Show error state, suggest refresh
- User-friendly messages, never raw errors

### Empty States

- No query: Show placeholder text
- Query too short: "Type at least 3 characters to search"
- No results: "No results found for '[query]'. Try different keywords."
- Total failure: "Search temporarily unavailable. Please try again later."

### Race Conditions

- AbortController cancels previous requests
- Only most recent search results displayed
- Loading state until completion

### Static JSON Fallback Issues

- If JSON missing: Try to generate, show error if fails
- If JSON corrupted: Log error, use API-only mode
- If JSON stale (>24h): Show "Results may be outdated" indicator

### Accessibility

- Screen reader announcements for loading/results/errors
- Full keyboard navigation
- Focus management (return focus after modal close)
- High contrast mode support

## Analytics & Monitoring

### Privacy-Friendly Tracking

**What to Track:**

- Search query text (anonymized, no user IDs)
- Number of results returned
- Result source (API vs. backup)
- Locale of search
- Timestamp
- Zero-result flag

**Implementation:**

- Server-side logging to file/database
- API endpoint: `POST /api/analytics/search` (fire-and-forget)
- No cookies, no user tracking, no PII
- GDPR compliant (legitimate interest)

**Future Dashboard:**

- Most popular queries
- Zero-result searches → identify content gaps
- Backup usage frequency
- Search performance/latency

**Privacy Notes:**

- Mention in Datenschutz: "We anonymously track search queries to improve content"
- No opt-out needed (non-invasive, legitimate interest)
- Data retention: 90 days, then auto-delete

## Implementation Checklist

### Dependencies

- [x] Install `@payloadcms/plugin-search`
- [x] Install `kbar`
- [x] Install/create German and English stopword lists

### Backend (Phase 1-3: Complete ✅)

- [x] Add search plugin to `payload.config.ts`
- [x] Implement `beforeSync` hook (text extraction, stopwords, displayTitle field)
- [x] Create `/api/search` endpoint
- [ ] Create `/api/search/generate-index` endpoint (deferred to Phase 5)
- [ ] Create `/api/analytics/search` endpoint (future)
- [ ] Seed static pages into search collection (future)
- [x] Test plugin access control (published only)

### Frontend (Phase 1-3: Complete ✅)

- [x] Create `src/services/search.ts` with API calls
- [x] Add KBar provider to root layout
- [x] Implement KBar actions (6 static navigation + dynamic search)
- [ ] Create first-time tutorial overlay (deferred to Phase 5)
- [ ] Create `/[locale]/search/page.tsx` (deferred to Phase 5)
- [ ] Add search icon/trigger to header (deferred to Phase 5)
- [x] Implement search result debouncing (150ms)
- [x] Implement keyboard shortcuts (cmd+k / ctrl+k)

### Testing (Phase 1-4: Complete ✅)

- [x] Search returns correct results per locale
- [x] displayTitle field shows clean names (not full content)
- [ ] Static pages appear in results (deferred)
- [ ] Relationship denormalization works (to be tested with posts)
- [x] Stopword filtering reduces noise
- [ ] Cache prevents duplicate API calls (to be implemented)
- [ ] Fallback activates when API fails (to be implemented)
- [ ] KBar tutorial shows once (to be implemented)
- [ ] Mobile experience is smooth (to be tested)
- [ ] Accessibility features work (to be tested)
- [ ] Analytics logging works (to be implemented)

### Documentation

- [x] Update implementation plan with displayTitle field
- [ ] Update Datenschutz page with analytics disclosure
- [ ] Add search feature to user documentation
- [ ] Document reindexing procedure for admins

## Migration & Rollout

**Strategy:** Phased implementation

**Completed Phases:**

1. ✅ **Phase 1-3: Backend & KBar Setup**
   - Payload Search Plugin configured with `displayTitle` field
   - Search API endpoint (`/api/search`) with locale filtering
   - Search service layer with API integration
   - KBar command palette with keyboard shortcuts
   - 6 static navigation actions (Artists, Projects, News, Contact, Team, Locale Switch)
   - Dynamic search results showing clean display titles
2. ✅ **Phase 4: Display Title Fix**
   - Added `displayTitle` field to search collection schema
   - Updated `beforeSyncHook` to populate displayTitle with clean document names
   - Modified search API to return displayTitle instead of full content
   - Manually synced all artists to search index
   - Verified locale filtering works correctly

**Remaining Phases:**

3. **Phase 5: Polish & Enhancement** (future)
   - Static JSON backup for offline resilience
   - Search page (`/[locale]/search`)
   - First-time tutorial overlay
   - Header search trigger
   - Session-based caching
   - Mobile optimizations

4. **Phase 6: Analytics & Monitoring** (future)
   - Privacy-friendly search analytics
   - Performance monitoring
   - Zero-result tracking

**Known Behavior:**

- Search index `locale` field in parent table shows `'de'` for all records (cosmetic issue)
- Actual locale filtering works correctly via `search_locales` table
- `beforeSyncHook` console logs show `locale: 'de'` but content is properly separated by locale

## Success Criteria

- Search returns relevant results in <200ms (API) or <500ms (backup)
- Zero data leaks (no private content in search)
- KBar tutorial completion rate >80%
- <5% of searches use backup fallback (indicates API reliability)
- Zero-result rate <20% (indicates good content coverage)
- Mobile users can search effectively
- Accessibility audit passes WCAG 2.1 AA

## Future Enhancements (Out of Scope)

- Advanced filters (date range, content type toggles)
- Search suggestions/autocomplete
- Recent searches history
- "Did you mean?" spelling corrections
- Faceted search (filter by instrument, year, category)
- Search result previews/snippets
- Keyboard shortcut customization
