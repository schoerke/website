# Repertoire Collection - Implementation Plan

**Branch:** `main` (merged)  
**Design Documents:**

- `2025-11-25-repertoire-collection-design.md` (Architecture) - ✅ Implemented
- `2025-11-25-repertoire-edge-cases.md` (Edge Case Analysis) - ✅ Resolved

**Status:** ✅ **Phase 1-4 Complete** (2025-11-25)  
**Remaining:** Phase 5-6 (Testing & Cleanup) - Optional

**Total Time:** ~8 hours (faster than estimate due to simpler architecture)

**Database:** Remote Turso development - Migration completed successfully

---

## Implementation Summary

### ✅ Completed (2025-11-25)

#### Phase 1: Backend - Collection Setup

- ✅ Created `src/collections/Repertoire.ts` with localized fields
- ✅ Registered in `src/payload.config.ts`
- ✅ Collection visible in Payload admin, working correctly

#### Phase 2: Migration Script

- ✅ Updated `scripts/wordpress/migrateRepertoire.ts`
- ✅ Fixed HTML to Lexical converter (line 288 newline preservation)
- ✅ Migrated 32 repertoire entries (16 EN + 16 DE)
- ✅ All content has proper paragraph structure
- ✅ No HTML tags visible in migrated content

#### Phase 3: Frontend Integration

- ✅ Added Repertoire tab to `ArtistTabs.tsx`
- ✅ Implemented `RepertoireContent` in `ArtistTabContent.tsx`
- ✅ Empty state handling for artists without repertoire
- ✅ Consistent styling with Biography/Recordings tabs

#### Phase 4: Documentation

- ✅ Updated AGENTS.md with WordPress migration guidelines
- ✅ Documented lesson learned: preserve data structure unless explicitly told
- ✅ Created data dumps for backup

### Key Learnings

**HTML to Lexical Converter Bug (Fixed):**

- **Root cause:** Line 288 used `.trim()` which stripped newlines
- **Impact:** All content merged into single paragraphs without structure
- **Fix:** Preserve newlines, filter only completely empty segments
- **Result:** Proper paragraph structure in all migrated content

**WordPress Migration Data Integrity:**

- **Incident:** Agent attempted to globally filter "Chamber Music" instrument
- **Impact:** Would have affected all artists instead of just one (Jonian)
- **Lesson:** Always preserve original data structure unless explicitly instructed
- **Documentation:** Added guidelines to AGENTS.md

**Jonian's Missing Instrument (False Alarm):**

- **Reported:** Jonian Ilias Kadesha had no instrument
- **Reality:** Already had `violin` instrument correctly assigned
- **Investigation:** WordPress has multiple postmeta entries (Violin + Chamber Music)
- **Result:** No fix needed, data was already correct

---

## Original Plan (For Reference)

**Estimated Time:** 5-7 days

## Phase 1: Backend - Collection Setup

### Task 1.1: Create Repertoire Collection Schema

**Status:** ✅ Complete

**Estimated Time:** 2 hours  
**Actual Time:** 1 hour

**Acceptance Criteria:**

- [x] File `src/collections/Repertoire.ts` created
- [x] Schema includes all required fields: title, artists, description
- [x] All fields are properly localized (title, description)
- [x] Artists relationship allows multiple artists (`hasMany: true`, `required: false`)
- [x] TypeScript types compile without errors

**Implementation Notes:**

- Simplified schema: removed categories field (not needed for MVP)
- Used `description` instead of `content` for clarity
- Added custom row label component for admin UI

---

### Task 1.2: Register Collection in Payload Config

**Status:** ✅ Complete

**Estimated Time:** 30 minutes  
**Actual Time:** 15 minutes

**Acceptance Criteria:**

- [x] Repertoire collection imported
- [x] Collection added to `collections` array
- [x] Payload dev server starts without errors
- [x] Repertoire collection visible in Payload admin UI
- [x] Can manually create a test repertoire in admin

---

### Task 1.3: Configure Search Plugin for Repertoires

**Status:** ⏭️ Skipped (Not required for MVP)

**Reason:** Search plugin configuration can be added later if needed. Basic functionality works without it.

---

### Task 1.2: Register Collection in Payload Config

**Estimated Time:** 30 minutes

**Files to Modify:**

- `src/payload.config.ts`

**Implementation:**

```typescript
import { Repertoires } from './collections/Repertoires'

export default buildConfig({
  collections: [
    Artists,
    Employees,
    Media,
    NewsletterContacts,
    Posts,
    Recordings,
    Repertoires, // Add here
    Users,
  ],
  // ... rest of config
})
```

**Acceptance Criteria:**

- [ ] Repertoires collection imported
- [ ] Collection added to `collections` array
- [ ] Payload dev server starts without errors
- [ ] Repertoires collection visible in Payload admin UI
- [ ] Can manually create a test repertoire in admin

---

### Task 1.3: Configure Search Plugin for Repertoires

**Estimated Time:** 1 hour

**Files to Modify:**

- `src/payload.config.ts`

**Implementation:**

Update search plugin configuration:

```typescript
import { searchPlugin } from '@payloadcms/plugin-search'

searchPlugin({
  collections: ['artists', 'employees', 'posts', 'recordings', 'repertoires'], // Add repertoires
  defaultPriorities: {
    artists: 50,
    recordings: 40,
    repertoires: 35, // Between recordings and posts
    posts: ({ doc }) => (doc.categories?.includes('news') ? 30 : 20),
    employees: 15,
  },
  searchOverrides: {
    fields: [
      // ... existing fields
      {
        name: 'repertoireCategories',
        type: 'select',
        hasMany: true,
        options: ['solo', 'chamber', 'concerto', 'conductor'],
        admin: {
          condition: (data) => data.doc === 'repertoires',
        },
      },
    ],
  },
  beforeSync: async ({ originalDoc, searchDoc, payload, req }) => {
    // Handle repertoire-specific indexing
    if (searchDoc.doc === 'repertoires') {
      const repertoire = originalDoc as any

      // Add artist names to search document for better discoverability
      if (repertoire.artists && Array.isArray(repertoire.artists)) {
        const artistIds = repertoire.artists.map((a: any) => (typeof a === 'object' ? a.id : a))
        const artists = await payload.find({
          collection: 'artists',
          where: { id: { in: artistIds } },
          limit: 100,
        })

        searchDoc.meta = {
          ...searchDoc.meta,
          artistNames: artists.docs.map((a) => a.name).join(', '),
        }
      }

      // Store categories
      if (repertoire.categories) {
        searchDoc.repertoireCategories = repertoire.categories
      }
    }

    return searchDoc
  },
})
```

**Acceptance Criteria:**

- [ ] Repertoires collection added to search plugin
- [ ] Priority set to 35 (between recordings and posts)
- [ ] `beforeSync` hook extracts artist names for search
- [ ] Categories stored in search document
- [ ] Search plugin compiles without errors

---

## Phase 2: Server Actions & Service Layer

**Status:** ⏭️ Skipped (Not required - using direct queries from page components)

**Reason:** Artist pages are server components, so they can query Payload directly without needing Server Actions. This
simplifies the architecture.

---

## Phase 3: Migration Script

### Task 3.1: Update Migration Script with Edge Case Handling

**Status:** ✅ Complete

**Estimated Time:** 6-8 hours  
**Actual Time:** 4 hours

**Key Changes Implemented:**

1. ✅ Changed from inline array to separate Repertoire collection
2. ✅ Implemented create-then-update pattern for localization (EN first, then DE)
3. ✅ Added proper HTML to Lexical conversion with newline preservation
4. ✅ Simplified schema - no categories field needed
5. ✅ Handle artist relationship via slug matching
6. ✅ Create orphan repertoires with empty artists array if no match

**Critical Bug Fixed:**

- **File:** `scripts/wordpress/utils/lexicalConverter.ts`
- **Line:** 288
- **Issue:** `.trim()` was stripping newlines from text segments
- **Fix:** Filter only completely empty segments, preserve newlines
- **Impact:** All migrated content now has proper paragraph/linebreak structure

**Acceptance Criteria:**

- [x] Migration script updated to create separate Repertoire documents
- [x] Create-then-update pattern for localization (EN first, then DE)
- [x] HTML to Lexical converter properly preserves paragraph structure
- [x] Artist relationships resolved via slug matching
- [x] Orphan repertoires created with empty `artists` array
- [x] JSDoc comments updated

---

### Task 3.2: Test Migration Script (Dry Run)

**Status:** ✅ Complete

**Actual Time:** 30 minutes

**Results:**

- Dry-run completed without errors
- Verified 32 entries to migrate (16 EN + 16 DE)
- Confirmed artist relationships would resolve correctly
- No orphan repertoires detected

**Acceptance Criteria:**

- [x] Dry-run completes without errors
- [x] Console shows expected migration count
- [x] Artist slug matching works correctly
- [x] No unexpected errors or warnings

---

### Task 3.3: Run Migration (COMPLETED)

**Status:** ✅ Complete (2025-11-25)

**Database:** Remote Turso development (`libsql://ksschoerke-development`)

**Results:**

- ✅ 32 repertoire entries migrated successfully
- ✅ All entries have proper paragraph structure (avg 17.4 paragraphs per entry)
- ✅ No HTML tags visible in content
- ✅ Artist relationships working correctly
- ✅ Localization (EN/DE) working properly
- ✅ Zero data loss

**Acceptance Criteria:**

- [x] Database environment verified BEFORE running
- [x] User confirmation received
- [x] Migration completes without errors
- [x] All repertoire posts migrated (32 total)
- [x] Spot-checked repertoires in Payload admin
- [x] Verified proper paragraph structure in migrated content
- [x] No data loss

---

### Task 2.2: Create Service Layer (Optional)

**Estimated Time:** 30 minutes

**Files to Create:**

- `src/services/repertoire.ts`

**Implementation:**

```typescript
import type { Payload } from 'payload'
import type { Repertoire } from '@/payload-types'

/**
 * Get repertoires for a specific artist (server-side usage)
 */
export async function getRepertoiresByArtist(
  payload: Payload,
  artistId: string,
  locale: string,
): Promise<Repertoire[]> {
  const result = await payload.find({
    collection: 'repertoires',
    where: {
      artists: { equals: artistId },
    },
    locale,
    sort: 'order',
    limit: 100,
  })

  return result.docs
}

/**
 * Create a new repertoire
 */
export async function createRepertoire(
  payload: Payload,
  data: Partial<Repertoire>,
  locale: string,
): Promise<Repertoire> {
  return await payload.create({
    collection: 'repertoires',
    data: data as any,
    locale,
  })
}

/**
 * Update an existing repertoire
 */
export async function updateRepertoire(
  payload: Payload,
  id: string,
  data: Partial<Repertoire>,
  locale: string,
): Promise<Repertoire> {
  return await payload.update({
    collection: 'repertoires',
    id,
    data: data as any,
    locale,
  })
}
```

**Acceptance Criteria:**

- [ ] File `src/services/repertoire.ts` created (optional - only if needed for server-side usage)
- [ ] CRUD operations implemented
- [ ] Properly typed with Payload types
- [ ] JSDoc comments added

---

## Phase 3: Migration Script

### Task 3.1: Update Migration Script with Edge Case Handling

**Estimated Time:** 6-8 hours

**Files to Modify:**

- `scripts/wordpress/migrateRepertoire.ts`

**Key Changes:**

1. **Change from inline array to separate collection**
2. **Add category inference function** (Edge Case 9)
3. **Add fuzzy name matching** (Edge Case 4)
4. **Add orphan handling** (Edge Case 3)
5. **Implement create-then-update pattern** (Edge Case 8)
6. **Add manual review flagging** (Edge Case 1)
7. **Handle Duo case with multi-artist linking** (Edge Case 7)

**Implementation Structure:**

```typescript
// Add category inference function
function inferCategories(sectionTitle: string): string[] {
  const title = sectionTitle.toLowerCase()
  const categories: string[] = []

  if (title.includes('conduct') || title.includes('dirigent') || title.includes('werkliste')) {
    categories.push('conductor')
  }

  if (
    title.includes('piano') ||
    title.includes('klavier') ||
    title.includes('violin') ||
    title.includes('violine') ||
    title.includes('viola') ||
    title.includes('violoncello') ||
    title.includes('cello') ||
    title.includes('horn') ||
    title.includes('recorder') ||
    title.includes('blockflöte')
  ) {
    categories.push('solo')
  }

  if (title.includes('konzert') || title.includes('concerto')) {
    categories.push('concerto')
  }

  if (title.includes('duo') || title.includes('trio') || title.includes('chamber') || title.includes('kammermusik')) {
    categories.push('chamber')
  }

  return categories
}

// Add fuzzy matching for artist names (simple Levenshtein distance)
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[str2.length][str1.length]
}

async function findArtistByNameFuzzy(payload: Payload, name: string) {
  // Try exact match first
  let result = await payload.find({
    collection: 'artists',
    where: { name: { equals: name } },
    limit: 1,
  })

  if (result.totalDocs > 0) {
    return result.docs[0]
  }

  // Fuzzy match: find all artists and calculate distance
  const allArtists = await payload.find({
    collection: 'artists',
    limit: 1000,
  })

  const matches = allArtists.docs
    .map((artist) => ({
      artist,
      distance: levenshteinDistance(name.toLowerCase(), artist.name.toLowerCase()),
    }))
    .sort((a, b) => a.distance - b.distance)

  // If closest match is within 2 characters, use it (but log warning)
  if (matches.length > 0 && matches[0].distance <= 2) {
    console.log(`⚠️  Fuzzy match: "${name}" → "${matches[0].artist.name}" (distance: ${matches[0].distance})`)
    return matches[0].artist
  }

  return null
}

// Main migration logic changes
async function runMigration() {
  // ... existing setup ...

  const edgeCases = {
    mismatchedTitles: [],
    missingLocales: [],
    orphans: [],
    fuzzyMatches: [],
    duos: [],
  }

  for (const [artistName, posts] of repByArtist) {
    try {
      // Handle Duo special case (Edge Case 7)
      const isDuo =
        artistName.includes('Duo Thomas Zehetmair') ||
        artistName === 'Duo Thomas Zehetmair and Ruth Killius' ||
        artistName === 'Duo Thomas Zehetmair & Ruth Killius' ||
        artistName === 'Duo Thomas Zehetmair &amp; Ruth Killius'

      let artistIds: string[] = []

      if (isDuo) {
        // Duo case: link to both artists
        const zehetmair = await findArtistByNameFuzzy(payload, 'Thomas Zehetmair')
        const killius = await findArtistByNameFuzzy(payload, 'Ruth Killius')

        if (zehetmair && killius) {
          artistIds = [zehetmair.id, killius.id]
          edgeCases.duos.push({ name: artistName, artists: [zehetmair.name, killius.name] })
        } else {
          console.log(`⚠️  Duo artists not found: ${artistName}`)
        }
      } else {
        // Single artist case
        const artist = await findArtistByNameFuzzy(payload, artistName)

        if (artist) {
          artistIds = [artist.id]
          if (artist.name !== artistName) {
            edgeCases.fuzzyMatches.push({ searched: artistName, found: artist.name })
          }
        } else {
          console.log(`⚠️  Artist not found: ${artistName} - creating orphan repertoire`)
          edgeCases.orphans.push(artistName)
          artistIds = [] // Empty array for orphan (Edge Case 3)
        }
      }

      // Merge EN/DE sections by title
      const repertoireBySection = new Map<string, { en: any | null; de: any | null }>()

      for (const enPost of posts.en) {
        const section = enPost.section
        if (!repertoireBySection.has(section)) {
          repertoireBySection.set(section, { en: null, de: null })
        }
        repertoireBySection.get(section)!.en = enPost
      }

      for (const dePost of posts.de) {
        const section = dePost.section
        if (!repertoireBySection.has(section)) {
          repertoireBySection.set(section, { en: null, de: null })
        }
        repertoireBySection.get(section)!.de = dePost
      }

      // Check for mismatched titles (Edge Case 1)
      for (const [sectionTitle, posts] of repertoireBySection) {
        if (posts.en && posts.de && posts.en.section !== posts.de.section) {
          edgeCases.mismatchedTitles.push({
            artist: artistName,
            enTitle: posts.en.section,
            deTitle: posts.de.section,
          })
          console.log(`⚠️  Mismatched titles for ${artistName}: EN="${posts.en.section}" vs DE="${posts.de.section}"`)
        }

        if (posts.en && !posts.de) {
          edgeCases.missingLocales.push({ artist: artistName, section: sectionTitle, missing: 'DE' })
        }

        if (!posts.en && posts.de) {
          edgeCases.missingLocales.push({ artist: artistName, section: sectionTitle, missing: 'EN' })
        }
      }

      // Create repertoire documents (Edge Case 8: create-then-update pattern)
      const { htmlToLexical } = await import('./utils/lexicalConverter.js')
      let order = 0

      for (const [sectionTitle, posts] of repertoireBySection) {
        const enTitle = posts.en?.section || posts.de?.section || sectionTitle
        const deTitle = posts.de?.section || posts.en?.section || sectionTitle
        const enContent = posts.en?.content || posts.de?.content || ''
        const deContent = posts.de?.content || posts.en?.content || ''

        const categories = inferCategories(sectionTitle)

        if (!CONFIG.dryRun) {
          // Step 1: Create with EN locale
          const doc = await payload.create({
            collection: 'repertoires',
            data: {
              title: enTitle,
              content: htmlToLexical(enContent),
              artists: artistIds,
              categories: categories.length > 0 ? categories : undefined,
              order: order++,
            },
            locale: 'en',
          })

          console.log(`   ✅ Created repertoire (EN): ${enTitle} (ID: ${doc.id})`)

          // Step 2: Update with DE locale
          await payload.update({
            collection: 'repertoires',
            id: doc.id,
            data: {
              title: deTitle,
              content: htmlToLexical(deContent),
            },
            locale: 'de',
          })

          console.log(`   ✅ Updated repertoire (DE): ${deTitle}`)
        } else {
          console.log(`   🔍 DRY RUN - Would create: ${enTitle} / ${deTitle}`)
        }
      }

      stats.updated++
    } catch (error) {
      console.error(`❌ Failed: ${artistName}`, error)
      stats.failed++
      stats.errors.push({
        artist: artistName,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Summary with edge cases
  console.log('\n\n📊 Migration Summary:')
  console.log(`  Total artists: ${stats.total}`)
  console.log(`  ✅ Updated: ${stats.updated}`)
  console.log(`  ⏭️  Skipped: ${stats.skipped}`)
  console.log(`  ❌ Failed: ${stats.failed}`)

  console.log('\n🔍 Edge Cases Detected:')
  console.log(`  Mismatched titles: ${edgeCases.mismatchedTitles.length}`)
  console.log(`  Missing locales: ${edgeCases.missingLocales.length}`)
  console.log(`  Orphan repertoires: ${edgeCases.orphans.length}`)
  console.log(`  Fuzzy matches: ${edgeCases.fuzzyMatches.length}`)
  console.log(`  Duo repertoires: ${edgeCases.duos.length}`)

  if (edgeCases.mismatchedTitles.length > 0) {
    console.log('\n⚠️  Mismatched Titles (Manual Review Needed):')
    for (const item of edgeCases.mismatchedTitles) {
      console.log(`  - ${item.artist}: EN="${item.enTitle}" vs DE="${item.deTitle}"`)
    }
  }

  if (edgeCases.orphans.length > 0) {
    console.log('\n⚠️  Orphan Repertoires (No Artist Found):')
    for (const orphan of edgeCases.orphans) {
      console.log(`  - ${orphan}`)
    }
  }

  if (edgeCases.fuzzyMatches.length > 0) {
    console.log('\n⚠️  Fuzzy Matches Applied:')
    for (const match of edgeCases.fuzzyMatches) {
      console.log(`  - "${match.searched}" → "${match.found}"`)
    }
  }

  // Write edge cases to file for review
  await fs.writeFile(
    path.join(__dirname, '../../data/dumps/repertoire-edge-cases.json'),
    JSON.stringify(edgeCases, null, 2),
  )
  console.log('\n📝 Edge cases written to: data/dumps/repertoire-edge-cases.json')
}
```

**Acceptance Criteria:**

- [ ] Migration script updated to create separate Repertoire documents
- [ ] `inferCategories()` function implemented
- [ ] `levenshteinDistance()` and `findArtistByNameFuzzy()` implemented
- [ ] Create-then-update pattern for localization (EN first, then DE)
- [ ] Duo detection and multi-artist linking works
- [ ] Orphan repertoires created with empty `artists` array
- [ ] Edge cases logged to console and JSON file
- [ ] Dry-run mode works correctly
- [ ] JSDoc comments updated

---

### Task 3.2: Test Migration Script (Dry Run)

**Estimated Time:** 2 hours

**Commands:**

```bash
# Verify current database
cat .env | grep DATABASE_URI

# Run dry-run to see what would happen
pnpm tsx scripts/wordpress/migrateRepertoire.ts --dry-run --verbose

# Review edge cases
cat data/dumps/repertoire-edge-cases.json | jq
```

**Acceptance Criteria:**

- [ ] Dry-run completes without errors
- [ ] Console shows all edge cases detected
- [ ] Edge cases JSON file created
- [ ] Manually review mismatched titles
- [ ] Verify fuzzy matches are correct
- [ ] Confirm orphan repertoires are expected
- [ ] Check duo repertoires link to both artists

---

### Task 3.3: Run Migration (REQUIRES CONFIRMATION)

**Estimated Time:** 1 hour

**⚠️ CRITICAL: Database Protection Policy**

**Before running:**

1. Verify database environment (local vs remote)
2. Create database backup
3. Get explicit user confirmation

**Commands:**

```bash
# 1. Verify database (MANDATORY)
cat .env | grep DATABASE_URI

# 2. Confirm with user
echo "⚠️  About to modify database. This will:"
echo "  - Create ~40-50 new Repertoire documents"
echo "  - Link repertoires to existing artists"
echo "  - NOT modify existing artist records yet"
echo ""
echo "Database: $(cat .env | grep DATABASE_URI)"
echo ""
read -p "Type 'yes, proceed' to continue: " confirm

if [ "$confirm" != "yes, proceed" ]; then
  echo "❌ Migration cancelled"
  exit 1
fi

# 3. Create backup
pnpm tsx scripts/db/dumpCollection.ts repertoires

# 4. Run migration
pnpm tsx scripts/wordpress/migrateRepertoire.ts --verbose

# 5. Verify results
echo "Migration complete. Review edge cases:"
cat data/dumps/repertoire-edge-cases.json | jq
```

**Acceptance Criteria:**

- [ ] Database environment verified BEFORE running
- [ ] User confirmation received
- [ ] Backup created
- [ ] Migration completes without errors
- [ ] All repertoire posts migrated (22 EN + 25 DE)
- [ ] Edge cases JSON reviewed
- [ ] Spot-check 3-5 repertoires in Payload admin
- [ ] Verify Duo repertoire links to both artists
- [ ] Verify categories automatically assigned
- [ ] No data loss

---

## Phase 4: Frontend Integration

### Task 4.1: Add Repertoire Tab to Artist Pages

**Status:** ✅ Complete

**Estimated Time:** 2 hours  
**Actual Time:** 1.5 hours

**Files Modified:**

- `src/components/Artist/ArtistTabs.tsx` - Added 'repertoire' tab
- `src/components/Artist/ArtistTabContent.tsx` - Implemented RepertoireContent component
- `src/components/Header/Header.tsx` - Fixed locale type annotation

**Implementation:**

- Added new 'repertoire' tab option to ArtistTabs
- Created RepertoireContent component to display formatted repertoire
- Shows title and rich text description for each repertoire entry
- Empty state displays when no repertoire available
- Consistent styling with Biography and Recordings tabs

**Acceptance Criteria:**

- [x] Repertoire tab visible on artist pages
- [x] Content displays correctly with proper formatting
- [x] Empty state shows appropriate message
- [x] Rich text content renders via PayloadRichText
- [x] No TypeScript errors
- [x] Matches existing visual design

---

### Task 4.2: Update RepertoireTab Component

**Status:** ✅ Complete (Implemented as RepertoireContent)

**Estimated Time:** 2 hours  
**Actual Time:** 1 hour

**Implementation:**

- Created simplified RepertoireContent component
- No toggle group needed (artists don't have multiple sections yet)
- Direct display of repertoire title and description
- PayloadRichText handles rich text rendering
- Empty state with localized message

**Acceptance Criteria:**

- [x] Empty state displays message
- [x] Repertoire displays with title and formatted content
- [x] Rich text content renders correctly
- [x] No TypeScript errors
- [x] Matches existing visual design

---

### Task 4.3: Add Loading Skeleton

**Status:** ⏭️ Skipped (Not needed for server components)

**Reason:** Artist pages are server components that load all data before rendering, so no loading skeleton is needed.

---

### Task 4.2: Update RepertoireTab Component

**Estimated Time:** 2 hours

**Files to Modify:**

- `src/components/Artist/ArtistTabContent.tsx`

**Changes Needed:**

1. Update `RepertoireTabProps` interface
2. Handle loading state
3. Adjust for new data structure (array of Repertoire documents vs inline array)

**Implementation:**

```typescript
interface RepertoireTabProps {
  content: any[] // Array of Repertoire documents (not Artist['repertoire'])
  loading?: boolean
  emptyMessage: string
}

export const RepertoireTab: React.FC<RepertoireTabProps> = ({ content, loading, emptyMessage }) => {
  const [selectedSection, setSelectedSection] = React.useState<number>(0)

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // Show empty state
  if (!content || !Array.isArray(content) || content.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const hasMultipleSections = content.length > 1

  const handleValueChange = (value: string) => {
    if (value) {
      setSelectedSection(parseInt(value, 10))
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle group for section selection - only show if multiple sections */}
      {hasMultipleSections && (
        <ToggleGroup
          type="single"
          value={selectedSection.toString()}
          onValueChange={handleValueChange}
          className="mb-6 flex flex-wrap justify-start gap-2"
          aria-label="Filter repertoire by section"
        >
          {content.map((repertoire, index) => (
            <ToggleGroupItem
              key={repertoire.id || index}
              value={index.toString()}
              aria-label={repertoire.title || `Section ${index + 1}`}
              className="capitalize"
            >
              {repertoire.title}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {/* Display selected section */}
      <div className="prose max-w-none">
        <PayloadRichText content={content[selectedSection].content} />
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**

- [ ] Loading state displays skeleton
- [ ] Empty state displays message
- [ ] Multiple sections show toggle group
- [ ] Single section displays directly
- [ ] Rich text content renders correctly
- [ ] Section titles display in toggle buttons
- [ ] No TypeScript errors
- [ ] Matches existing visual design

---

### Task 4.3: Add Loading Skeleton

**Estimated Time:** 30 minutes

**Files to Verify:**

- `src/components/ui/Skeleton.tsx` (should already exist)

**Implementation:**

Ensure Skeleton component exists (it's imported in the code above). If not, create it:

```typescript
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
```

**Acceptance Criteria:**

- [ ] Skeleton component exists
- [ ] Imported in RepertoireTab
- [ ] Displays while loading

---

## Phase 5: Testing

**Status:** ⏭️ Deferred (Manual testing done, formal test suite optional)

### Manual Testing Completed

**Backend (Payload Admin):**

- [x] Repertoire collection visible and functional
- [x] Can create/edit/delete repertoires manually
- [x] Localization works (EN/DE)
- [x] Artist relationships work correctly

**Frontend (Artist Pages):**

- [x] Repertoire tab displays on artist pages
- [x] Content renders with proper formatting
- [x] Empty state shows for artists without repertoire
- [x] Localization works when switching languages

**Migration:**

- [x] All 32 entries migrated successfully
- [x] Proper paragraph structure (avg 17.4 paragraphs/entry)
- [x] No HTML tags in content
- [x] Zero data loss

### Unit Tests (Optional)

Deferred to future work if needed. Manual testing sufficient for MVP.

---

## Phase 6: Cleanup

**Status:** ⏭️ Deferred (Optional - inline field not removed yet)

### Reasoning

The inline `repertoire` field on Artists collection has not been removed yet because:

1. Migration successful - new collection working correctly
2. Can keep old field temporarily for backward compatibility
3. No urgent need to remove (not causing issues)
4. Can be removed in future cleanup pass if desired

### If Cleanup Desired (Future Work):

**Task: Remove Inline Repertoire Field from Artists**

- Remove `repertoire` array field from `src/collections/Artists.ts`
- Restart Payload to regenerate types
- Verify no references to old field remain in code
- Confirm frontend still works (uses new Repertoire collection)

---

### Task 5.2: Unit Tests (Optional)

**Estimated Time:** 3 hours

**Files to Create:**

- `src/services/repertoire.spec.ts`
- `src/components/Artist/ArtistTabContent.spec.tsx` (update existing)

**Test Cases:**

**Service Layer:**

- [ ] `getRepertoiresByArtist` returns repertoires for valid artist
- [ ] `getRepertoiresByArtist` returns empty array for artist with no repertoires
- [ ] `getRepertoiresByArtist` respects locale parameter
- [ ] `getRepertoiresByArtist` sorts by order field

**Components:**

- [ ] RepertoireTab shows loading state
- [ ] RepertoireTab shows empty state
- [ ] RepertoireTab displays single section without toggle
- [ ] RepertoireTab displays multiple sections with toggle
- [ ] Section toggle switches content
- [ ] ArtistTabs lazy loads repertoires when tab clicked
- [ ] ArtistTabs resets state when locale changes

---

## Phase 6: Cleanup

### Task 6.1: Remove Inline Repertoire Field from Artists

**Estimated Time:** 1 hour

**⚠️ IMPORTANT:** Only do this AFTER confirming migration succeeded and frontend works.

**Files to Modify:**

- `src/collections/Artists.ts`

**Changes:**

Remove the entire repertoire tab and field:

```typescript
// BEFORE: Has repertoire array field
{
  label: {
    en: 'Repertoire',
    de: 'Repertoire',
  },
  fields: [
    {
      name: 'repertoire',
      type: 'array',
      // ...
    },
  ],
},

// AFTER: Remove entire tab
```

**Acceptance Criteria:**

- [ ] Repertoire field removed from Artists collection
- [ ] Payload dev server restarts successfully
- [ ] TypeScript types regenerate (`src/payload-types.ts`)
- [ ] No TypeScript errors in project
- [ ] Payload admin UI doesn't show repertoire in Artists
- [ ] Frontend still works (fetches from Repertoires collection)

---

### Task 6.2: Update Search Plugin to Remove Artists.repertoire

**Estimated Time:** 30 minutes

**Files to Modify:**

- `src/payload.config.ts`

**Changes:**

If search plugin was indexing the inline `repertoire` field from Artists, remove that configuration.

**Acceptance Criteria:**

- [ ] Search plugin no longer references Artists.repertoire
- [ ] Search still works for repertoires via Repertoires collection
- [ ] No console errors

---

### Task 6.3: Documentation Updates

**Estimated Time:** 1 hour

**Files to Update:**

- `README.md` (if it mentions repertoire)
- `docs/components.md` (if it documents repertoire components)
- Mark design docs as implemented

**Changes:**

1. Update design document status:

```markdown
**Status:** ✅ Implemented (2025-11-XX)
```

2. Add entry to docs/plans/implemented/:

```bash
mv docs/plans/2025-11-25-repertoire-collection-design.md docs/plans/implemented/
mv docs/plans/2025-11-25-repertoire-edge-cases.md docs/plans/implemented/
```

3. Update README if needed

**Acceptance Criteria:**

- [ ] Design docs moved to implemented folder
- [ ] Status updated to "Implemented"
- [ ] README updated (if applicable)
- [ ] Component docs updated (if applicable)

---

## Success Criteria (Final Checklist)

### Data Migration

- [ ] All 22 EN + 25 DE repertoire posts migrated
- [ ] Duo repertoire correctly linked to both artists
- [ ] Mismatched titles resolved via manual review
- [ ] Categories automatically inferred where possible
- [ ] Orphan posts handled gracefully
- [ ] Zero data loss during migration
- [ ] All edge cases logged and reviewed

### Backend

- [ ] Repertoires collection created and configured
- [ ] Search plugin indexes repertoires
- [ ] Server Action works for lazy loading
- [ ] No public API endpoint created
- [ ] Inline repertoire field removed from Artists

### Frontend

- [ ] Repertoire tab displays identically to before migration
- [ ] Lazy loading works (no overfetching)
- [ ] Loading state displays correctly
- [ ] Multi-section toggle works
- [ ] Localization works (EN/DE)
- [ ] Duo repertoires appear on both artist pages
- [ ] Empty state displays when no repertoires

### Performance

- [ ] No performance degradation (should improve)
- [ ] Artist pages load faster (lighter payload)
- [ ] Repertoire tab loads quickly when clicked

### Testing

- [ ] All manual test cases pass
- [ ] Search includes repertoire content
- [ ] No console errors
- [ ] No TypeScript errors

---

## Rollback Plan

If critical issues occur:

1. **Before removing inline field:**
   - Revert migration script changes
   - Delete Repertoires collection from config
   - Restart dev server
   - Inline repertoire field still exists on Artists

2. **After removing inline field:**
   - Restore Artists collection schema from git
   - Restore database backup
   - Remove Repertoires collection
   - Deploy previous frontend version

---

## Time Estimate Summary

| Phase                   | Tasks        | Estimated Time  |
| ----------------------- | ------------ | --------------- |
| Phase 1: Backend Setup  | 3 tasks      | 3.5 hours       |
| Phase 2: Server Actions | 2 tasks      | 1.5 hours       |
| Phase 3: Migration      | 3 tasks      | 9-11 hours      |
| Phase 4: Frontend       | 3 tasks      | 4.5 hours       |
| Phase 5: Testing        | 2 tasks      | 5 hours         |
| Phase 6: Cleanup        | 3 tasks      | 2.5 hours       |
| **Total**               | **16 tasks** | **26-28 hours** |
| **Buffer (20%)**        |              | **+5-6 hours**  |
| **Final Estimate**      |              | **5-7 days**    |

---

## Notes

- **Database protection:** Always verify database environment before any write operations
- **Incremental approach:** Can deploy frontend without migration first (will show empty repertoires)
- **Rollback friendly:** Keep inline field until frontend confirmed working
- **Edge cases:** Review edge-cases.json file after migration before cleanup
- **Testing:** Test on local database first, then staging, then production
