# Repertoire Collection - Edge Cases Analysis

**Date:** 2025-11-25  
**Status:** ✅ Resolved and Implemented

**Implementation Notes:**

- All edge cases have been addressed in the migration script
- WordPress data migrated successfully with proper edge case handling
- Mismatched titles handled via language fallback
- Orphan repertoires imported (no issues encountered)
- Duo/ensemble multi-artist linking working correctly

---

## Edge Case 1: Mismatched Section Titles Between EN/DE

**Issue:** Section names differ between languages but contain the same content.

**Examples:**

- Ruth Killius: "Viola" (EN) ≠ "Violakonzerte" (DE)
- Thomas Zehetmair: "Conductor" (EN) ≠ "Dirigent" (DE)
- Maurice Steger: "Recorder" (EN) ≠ "Blockflöte" (DE)

**Decision:** ✅ Manual review required

**Implementation:**

- Migration script flags mismatched titles for manual review
- Operator decides correct pairing during migration
- Log warnings for human inspection

---

## Edge Case 2: Missing Localized Versions

**Issue:** Some repertoires exist only in EN or only in DE.

**Examples:**

- "Duo Thomas Zehetmair und Ruth Killius - Repertoire" (DE only)
- "Maurice Steger - Repertoire Dirigent" (DE only)
- "Thomas Zehetmair - Repertoire Conductor" (EN only)

**Decision:** ✅ Language fallback

**Implementation:**

- Use Payload's localization fallback feature
- If content missing in requested locale, serve the other locale's content
- No empty placeholders needed

---

## Edge Case 3: Orphan Repertoire Posts (No Artist Category)

**Issue:** Some repertoire posts can't be linked to an artist.

**Examples:**

- "Repertoire" (standalone, no artist name)
- "Repertoire - Werkliste Dirigent" (conductor work list without artist)
- "Repertoire Tianwa Yang" (unusual title format)

**Decision:** ✅ Best-effort matching, import with no artist if no match

**Implementation:**

- Try to extract artist name from title/content
- Use fuzzy matching to find artist in database
- If no match found, create Repertoire document with empty `artists` array
- Log orphan entries for manual review post-migration

---

## Edge Case 4: Artist Name Typos/Variations

**Issue:** Artist names in WordPress posts don't exactly match artist records.

**Examples:**

- EN: "Dominik **Wagner**"
- DE: "Dominik **Wager**" (typo)
- Database: "Dominik Wagner" (correct)

**Implementation:**

- Use fuzzy name matching (Levenshtein distance or similar)
- Log potential typos for review
- Fall back to exact match if fuzzy matching is ambiguous

---

## Edge Case 5: Artists Exceeding maxRows Limit

**Status:** ✅ Not an issue

**Analysis:** Maximum 3 sections per artist found in WordPress data, well under the current limit of 5.

---

## Edge Case 6: Duplicate Section Entries

**Status:** ✅ Not an issue

**Analysis:** No actual duplicates found. Earlier counts were combining EN+DE results.

---

## Edge Case 7: Duo/Ensemble Repertoire Assignment

**Issue:** "Duo Thomas Zehetmair und Ruth Killius" repertoire needs to link to both artists.

**Decision:** ✅ Single shared entry with multiple artists

**Implementation:**

```typescript
{
  title: { en: "Duo Repertoire", de: "Duo-Repertoire" },
  artists: [zehetmairId, killiusId], // Both artist IDs
  content: { en: lexicalEN, de: lexicalDE }
}
```

**Benefits:**

- Single source of truth
- No data duplication
- Easy to maintain

---

## Edge Case 8: Localized Field Structure

**Issue:** How to create Repertoire documents with both EN and DE content.

**Decision:** ✅ Create then update pattern

**Implementation:**

```typescript
// 1. Create with EN locale
const doc = await payload.create({
  collection: 'repertoires',
  data: { title: enTitle, content: enContent, artists: [artistId] },
  locale: 'en',
})

// 2. Update with DE locale (adds second locale to same document)
await payload.update({
  collection: 'repertoires',
  id: doc.id,
  data: { title: deTitle, content: deContent },
  locale: 'de',
})
```

**Rationale:**

- Consistent with existing migration patterns
- Ensures hooks fire correctly per locale
- Required for proper search indexing in both languages

---

## Edge Case 9: Automatic Category Inference

**Issue:** Repertoire sections need categorization but titles are varied.

**Decision:** ✅ Multi-select categories with smart inference

**Schema:**

```typescript
{
  name: 'categories',
  type: 'select',
  hasMany: true,
  required: false,
  options: ['solo', 'chamber', 'concerto', 'conductor'],
}
```

**Inference Logic:**

```typescript
function inferCategories(sectionTitle: string): string[] {
  const title = sectionTitle.toLowerCase()
  const categories: string[] = []

  // Conductor keywords
  if (title.includes('conduct') || title.includes('dirigent') || title.includes('werkliste')) {
    categories.push('conductor')
  }

  // Solo instrument keywords
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

  // Concerto keywords
  if (title.includes('konzert') || title.includes('concerto')) {
    categories.push('concerto')
  }

  // Chamber music keywords
  if (title.includes('duo') || title.includes('trio') || title.includes('chamber') || title.includes('kammermusik')) {
    categories.push('chamber')
  }

  return categories // Empty array if no match
}
```

**Examples:**

- "Piano" → `['solo']`
- "Play/Conduct" → `['solo', 'conductor']`
- "Violakonzerte" → `['solo', 'concerto']`
- "Duo Repertoire" → `['chamber']`
- "Repertoire" (generic) → `[]` (no categories)

---

## Edge Case 10: Empty/Undetermined Categories

**Decision:** ✅ Leave categories empty if no match (don't force a default)

**Implementation:**

- Return empty array from `inferCategories()` if no keywords match
- No "general" category option
- Cleaner data model

---

## Edge Case 11: Access Control

**Decision:** ✅ Public read access (same as Artists)

**Implementation:**

```typescript
export const Repertoires: CollectionConfig = {
  slug: 'repertoires',
  access: {
    read: () => true, // Public read access
  },
  // ...
}
```

---

## Edge Case 12: Search Indexing

**Decision:** ✅ Index repertoires in search collection

**Implementation:**

- Configure `@payloadcms/plugin-search` to index repertoires collection
- Use separate API calls per locale (EN, DE) for proper indexing
- Users can search for repertoire content (e.g., "Beethoven sonatas")

**Benefits:**

- Find artists by repertoire ("Who performs Ligeti?")
- Improved discoverability

---

## Edge Case 13: API Endpoints

**Decision:** ✅ Artist-only fetching (via service layer/server actions)

**Implementation:**

- No direct public API endpoint for repertoires
- Fetch through Server Actions for client-side lazy loading
- Service layer methods for server-side usage

---

## Edge Case 14: Draft/Published States

**Decision:** ✅ No versioning (edits go live immediately)

**Implementation:**

- Simple collection without `versions` or `drafts`
- No editorial workflow needed
- Edits are immediate (like Artists collection)

---

## Edge Case 15: Frontend Data Fetching Pattern

**Decision:** ✅ Client-side lazy loading via Server Actions

**Implementation:**

**Server Action** (`src/actions/repertoire.ts`):

```typescript
'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

export async function getRepertoiresByArtist(artistId: string, locale: string) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'repertoires',
    where: { artists: { equals: artistId } },
    locale,
    sort: 'order',
  })
  return result.docs
}
```

**Client Component** (`ArtistTabs.tsx`):

```typescript
import { getRepertoiresByArtist } from '@/actions/repertoire'

const [repertoires, setRepertoires] = useState<any[]>([])
const [repertoiresFetched, setRepertoiresFetched] = useState(false)
const [repertoiresLoading, setRepertoiresLoading] = useState(false)

// Reset when locale changes
useEffect(() => {
  setRepertoiresFetched(false)
}, [locale])

// Lazy load when tab is opened
useEffect(() => {
  if (activeTab === 'repertoire' && !repertoiresFetched && !repertoiresLoading) {
    setRepertoiresLoading(true)
    getRepertoiresByArtist(artist.id, locale)
      .then((data) => {
        setRepertoires(data)
        setRepertoiresFetched(true)
      })
      .catch((err) => {
        console.error('Failed to fetch repertoires:', err)
        setRepertoiresFetched(true)
      })
      .finally(() => setRepertoiresLoading(false))
  }
}, [activeTab, artist.id, repertoiresFetched, repertoiresLoading, locale])
```

**Benefits:**

- ✅ No overfetching (only loads when tab is opened)
- ✅ No public API endpoint created
- ✅ Type-safe with TypeScript
- ✅ Matches existing pattern for recordings
- ✅ Secure (Next.js encrypted RPC)
- ✅ Modern Next.js App Router pattern

---

## Implementation Checklist

- [ ] Update schema with multi-select `categories` field
- [ ] Implement `inferCategories()` function in migration script
- [ ] Add fuzzy name matching for artist lookup
- [ ] Handle orphan repertoires (empty artists array)
- [ ] Implement create-then-update pattern for localization
- [ ] Configure search plugin for repertoires collection
- [ ] Create Server Action: `src/actions/repertoire.ts`
- [ ] Update ArtistTabs component to lazy load repertoires
- [ ] Update RepertoireTab to work with new data structure
- [ ] Remove inline `repertoire` field from Artists collection (after migration)

---

## Migration Script Enhancements Needed

1. **Manual review flagging** for mismatched titles
2. **Fuzzy matching** for artist name typos
3. **Orphan handling** for posts without artist categories
4. **Category inference** with keyword detection
5. **Duo detection** and multi-artist linking
6. **Localization** via create-then-update pattern
7. **Logging** of all edge cases for post-migration review

---

## Files to Create/Modify

### New Files

- `src/collections/Repertoires.ts` - Collection schema
- `src/actions/repertoire.ts` - Server Action for lazy loading
- `src/services/repertoire.ts` - Service layer (if needed for server-side usage)
- `src/components/Repertoire/RepertoireList.tsx` - Display component (if needed)

### Modified Files

- `src/collections/Artists.ts` - Remove inline repertoire field (post-migration)
- `src/payload.config.ts` - Add Repertoires collection + search plugin config
- `src/components/Artist/ArtistTabs.tsx` - Add lazy loading for repertoires
- `src/components/Artist/ArtistTabContent.tsx` - Update RepertoireTab
- `scripts/wordpress/migrateRepertoire.ts` - Update to create separate collection

---

## Success Criteria

- [ ] All 22 EN + 25 DE repertoire posts migrated
- [ ] Duo repertoire correctly linked to both artists
- [ ] Mismatched titles resolved via manual review
- [ ] Categories automatically inferred where possible
- [ ] Orphan posts handled gracefully
- [ ] Frontend displays repertoires identically to before
- [ ] Search includes repertoire content
- [ ] Zero data loss during migration
- [ ] All edge cases logged for review
- [ ] No overfetching (lazy loading works correctly)
