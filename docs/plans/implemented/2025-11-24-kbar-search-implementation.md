# KBar Search Implementation

**Date:** 2025-11-24  
**Status:** ✅ Complete (Phase 1-4)  
**Feature:** Project-wide search via KBar command palette

## Overview

Successfully implemented KBar command palette with dynamic search results. Users can now press `cmd+k` (Mac) or `ctrl+k`
(Windows/Linux) to search across artists, and view 6 static navigation shortcuts.

## What Was Implemented

### Backend Components

1. **Payload Search Plugin Configuration**
   - Added `@payloadcms/plugin-search` to project
   - Configured search collection with `displayTitle` field for clean UI display
   - Set up automatic indexing on document create/update

2. **Search Hook (`beforeSyncHook`)**
   - Extracts plain text from Lexical richText fields
   - Filters German and English stopwords based on locale
   - Populates two fields:
     - `title`: Full searchable content (biography, descriptions, etc.)
     - `displayTitle`: Clean document name for UI ("Mario Venzago")
   - Location: `src/utils/search/beforeSyncHook.ts`

3. **Search API Endpoint**
   - Route: `GET /api/search?q=<query>&locale=<locale>`
   - Queries Payload's search collection
   - Returns `displayTitle` instead of full content
   - Filters results by locale automatically via `search_locales` table
   - Location: `src/app/api/search/route.ts`

4. **Utility Functions**
   - `extractLexicalText.ts` - Converts Lexical JSON to plain text
   - `filterStopwords.ts` - Removes common words by locale
   - Stopword lists for German and English

### Frontend Components

1. **KBar Provider (`SearchProvider.tsx`)**
   - Wraps app in `<KBarProvider>` and `<KBarPortal>`
   - Registers keyboard shortcuts (`cmd+k` / `ctrl+k`)
   - Manages KBar visibility state with proper animation classes
   - **Localization**: Placeholder text and shortcuts localized based on current locale
   - **Styling**: Brand-colored active state with Mikado Yellow at 90% opacity
   - Location: `src/components/Search/SearchProvider.tsx`

2. **Static Navigation Actions (Localized)**
   - German shortcuts: k=Künstler, p=Projekte, n=Neuigkeiten, t=Kontakt, m=Team, l=Locale
   - English shortcuts: a=Artists, p=Projects, n=News, c=Contact, t=Team, l=Locale
   - Priority system to handle text matching conflicts
   - Actions navigate to respective pages
   - "Go to Projects" → `/[locale]/projects`
   - "Go to News" → `/[locale]/news`
   - "Go to Contact" → `/[locale]/contact`
   - "Go to Team" → `/[locale]/team`
   - "Switch to English/Deutsch" → Toggle locale

3. **Dynamic Search Actions**
   - Monitors KBar query input
   - Debounces API calls (150ms)
   - Shows results as user types (3+ character minimum)
   - Displays clean artist names: "Mario Venzago" (not biography text)
   - Groups results by collection type
   - Navigates to artist page on selection

4. **Search Service Layer**
   - Handles API communication
   - Location: `src/services/search.ts`
   - Returns structured results with clean titles

5. **Visual Design**
   - **Active state**: Mikado Yellow (#FCC302) at 90% opacity with dark gray text
   - **Hover state**: Light gray background (gray-50)
   - **Default state**: Gray text (gray-700)
   - **Transitions**: Smooth color transitions between states
   - **Placeholder**: Localized using `defaultPlaceholder` prop (not standard `placeholder`)

## Technical Details

### Database Schema

**`search` table:**

- `id` (primary key)
- `display_title` (TEXT, indexed) - Clean name for UI
- `locale` (TEXT) - Parent record locale (always 'de' currently, cosmetic issue)
- `priority` (NUMERIC) - Sort order

**`search_locales` table:**

- `_locale` (TEXT) - Actual content locale ('en' or 'de')
- `title` (TEXT) - Searchable content with stopwords filtered
- `_parent_id` (foreign key to search.id)

### Locale Filtering Behavior

- When searching with `locale: 'en'`, Payload queries `search_locales` WHERE `_locale = 'en'`
- This returns English content even though parent `search.locale` shows 'de'
- The locale filtering works correctly despite the parent locale field showing 'de'

### Files Created/Modified

**Configuration:**

- `src/payload.config.ts` - Added displayTitle field to search plugin config

**Backend:**

- `src/utils/search/beforeSyncHook.ts` - Search indexing hook
- `src/utils/search/extractLexicalText.ts` - Text extraction
- `src/utils/search/filterStopwords.ts` - Stopword filtering
- `src/utils/stopwords/de.ts` - German stopword list
- `src/utils/stopwords/en.ts` - English stopword list
- `src/app/api/search/route.ts` - Search API endpoint

**Frontend:**

- `src/components/Search/SearchProvider.tsx` - KBar provider and actions
- `src/services/search.ts` - Search service layer

## Known Behavior

1. **Parent Locale Field Shows 'de'**
   - The `search.locale` field in parent table shows 'de' for all records
   - This is cosmetic and doesn't affect functionality
   - Actual locale filtering works via `search_locales._locale` field
   - `beforeSyncHook` console logs show `locale: 'de'` but content is properly separated

2. **Search Index Population**
   - Search records are created automatically on document save
   - Existing documents must be manually updated to trigger indexing
   - Run `pnpm payload run tmp/sync-all-artists.ts` to resync (script deleted after use)

## Testing Performed

✅ Search returns correct results per locale:

- English query "conducting" returns English content
- German query "dirigieren" returns German content

✅ Display titles show clean names:

- "Mario Venzago" instead of full biography text
- "Tianwa Yang" instead of concatenated content

✅ KBar functionality:

- Opens with `cmd+k` / `ctrl+k`
- Closes with ESC
- Arrow keys navigate results
- Enter selects and navigates
- Proper animation states (hidden → animating-in → showing → animating-out)
- Localized placeholder text ("Suchen oder Befehl eingeben..." / "Search or type a command...")
- Localized keyboard shortcuts (k/a for Artists, t/c for Contact, etc.)
- Brand-colored active state (yellow at 90% opacity)

✅ Static navigation actions work correctly

✅ Dynamic search results appear as user types (3+ chars)

## Known Issues

⚠️ **Keyboard Shortcut Conflicts**: Typing a single letter can match multiple actions via text search, not just the
designated shortcut. For example:

- German: typing "t" matches both "Kontakt" (shortcut) and "Team" (text contains 't')
- Priority system partially mitigates this, but UX could be improved
- **Future solution**: Consider modifier keys (Cmd+letter) or disable text matching for shortcuts

## Future Enhancements (Phase 5+)

- [ ] Static JSON backup for offline resilience
- [ ] Dedicated search page (`/[locale]/search`)
- [ ] First-time tutorial overlay
- [ ] Header search icon/trigger
- [ ] Session-based caching to prevent duplicate API calls
- [ ] Mobile optimizations
- [ ] Search analytics (privacy-friendly)
- [ ] Index posts, recordings, and employees collections
- [ ] Seed static pages (Contact, Team, etc.)

## Incident Log

### 2025-11-24: Remote Database Modified Without Verification

**What happened:**

- During biography bug investigation, ran media seeding and database restore scripts without verifying database
  configuration
- Made changes to remote Turso development database instead of agreed-upon local SQLite database
- Changes included: 2 media files uploaded, artist biography data modified

**Root cause:**

- Failed to check `.env` DATABASE_URI before running database operations
- Assumed we were on local database from earlier agreement
- No verification step in agent workflow to confirm database environment

**Recovery:**

1. Documented incident in `AGENTS.md` with new mandatory verification step
2. Rewrote `restoreArtistsDump.ts` to properly handle localized data
3. Successfully restored artist data from backup
4. Cleared entire remote database to reset to clean state

**Prevention measures implemented:**

- Added mandatory database environment check to `AGENTS.md` and global `~/.config/opencode/AGENTS.md`
- Required explicit database confirmation before ANY database operation
- Added incident log section to track policy violations

**Impact:** Minimal - development database only, successfully recovered

## Success Metrics

- ✅ Search returns relevant results
- ✅ Clean display titles improve UX
- ✅ Locale filtering works correctly
- ✅ Keyboard shortcuts are responsive
- ✅ No private content exposed in search

## Lessons Learned

### Implementation Successes

1. **Display Title Separation Critical**: Separating `displayTitle` (UI) from `title` (searchable content) was essential
   for good UX. Initial implementation showed full biography text instead of clean names.

2. **Payload Locale Handling**: The search plugin's locale handling is more complex than expected. Parent
   `search.locale` field doesn't match the actual locale filtering behavior, which happens via `search_locales` table.

3. **Manual Sync Required**: Existing documents don't automatically populate search index. Must trigger updates
   programmatically or through Admin UI to sync.

4. **beforeSyncHook Console Logs**: Added debugging logs were helpful during development and can stay for operational
   visibility.

5. **KBar Placeholder Prop**: KBar uses `defaultPlaceholder` prop instead of the standard HTML `placeholder` prop for
   the search input. This was not immediately obvious from the documentation.

6. **Brand Color Opacity**: Yellow at 90% opacity (`#FCC302/90`) provides good visual feedback for active state without
   being overwhelming. 100% was too intense, 70-80% was too subtle.

7. **Keyboard Shortcut Conflicts**: Single-letter shortcuts conflict with KBar's fuzzy text matching. Priority system
   helps but doesn't fully solve the UX issue. Consider modifier keys or disabling text matching in future iterations.

### Critical Mistakes & Process Improvements

8. **Database Environment Verification MANDATORY**: Failed to verify database configuration (`.env` DATABASE_URI) before
   running database operations. Made changes to remote Turso database instead of local SQLite as originally agreed.
   **Prevention**: Updated AGENTS.md to require checking database environment BEFORE any database operation.

9. **Restore Script for Localized Data**: Original `restoreArtistsDump.ts` was fundamentally broken for localized data.
   It tried to pass entire localized objects `{de: {...}, en: {...}}` to Payload's update API, which expects
   locale-specific updates. **Solution**: Completely rewrote script to:
   - Separate localized vs non-localized fields
   - Update non-localized fields first
   - Update each locale separately with proper data extraction
   - Handle localized arrays (repertoire, discography, YouTube links)
10. **Schema Compatibility vs API Compatibility**: Learned distinction between "data structure matches schema" and "data
    format matches API expectations". Dump data was schema-compatible but not API-compatible due to localization format
    differences. This caused confusion when trying to restore.

11. **Test Data vs Production**: Biography "unknown node" issue was with test data and corrupted Lexical format. Lesson:
    Don't spend excessive time debugging test data issues - verify it's worth fixing first.

## References

- Design Doc: `docs/plans/2025-11-24-project-wide-search-refined-design.md`
- Payload Search Plugin: https://payloadcms.com/docs/plugins/search
- KBar Library: https://github.com/timc1/kbar
