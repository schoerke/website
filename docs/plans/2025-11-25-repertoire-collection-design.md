# Repertoire Collection Architecture Design

**Date:** 2025-11-25  
**Status:** Planning - Not Implemented  
**Related:** `2025-11-22-recording-collection-design.md`

## Overview

This document outlines the architecture for a new **Repertoire** collection to manage artist repertoires separately from
the Artist collection. This approach improves performance, reduces data duplication, and provides better data
management.

## Current State (Before Implementation)

### Problem with Current Architecture

The Artist collection currently has an inline `repertoire` array field:

```typescript
{
  name: 'repertoire',
  type: 'array',
  maxRows: 5,
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      required: true,
    },
  ],
}
```

**Issues:**

1. **Performance:** Large repertoire lists bloat the Artist document
2. **Duplication:** Duo/ensemble repertoires require duplicating data across multiple artists
3. **Scalability:** Limited to 5 sections per artist
4. **Querying:** Cannot query/filter repertoires independently

### WordPress Data to Migrate

**WordPress Structure:**

- Post type: `post`
- Categories: Artist name + "Repertoire"
- 32 EN + 32 DE repertoire posts across 23 artists
- Some artists have multiple repertoire sections (e.g., Piano, Conductor, Chamber Music)
- **Special case:** "Duo Thomas Zehetmair & Ruth Killius" should link to both artists

**Example WordPress Post:**

```xml
<title>Christian Zacharias – Repertoire Piano</title>
<category>Christian Zacharias</category>
<category>repertoire</category>
<content:encoded>
  <p>Bach - Partitas, French Suites, English Suites</p>
  <p>Beethoven - Complete Piano Sonatas</p>
  ...
</content:encoded>
```

## Proposed Architecture

### New Repertoire Collection

Create a separate `Repertoire` collection with relationship to artists:

```typescript
{
  slug: 'repertoires',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      // e.g., "Piano", "Conductor", "Chamber Music"
    },
    {
      name: 'artists',
      type: 'relationship',
      relationTo: 'artists',
      hasMany: true,
      required: true,
      // Allows linking one repertoire to multiple artists (e.g., duos)
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      required: true,
      // Actual repertoire list
    },
    {
      name: 'category',
      type: 'select',
      options: ['solo', 'chamber', 'concerto', 'conductor', 'general'],
      // Optional categorization
    },
    {
      name: 'order',
      type: 'number',
      // Display order when multiple repertoires per artist
    },
  ],
}
```

### Artist Collection Changes

**Remove** the inline `repertoire` array field from the Artist collection.

**Add** a virtual field or service layer method to fetch repertoires:

```typescript
// Service layer (src/services/repertoire.ts)
export async function getRepertoiresByArtist(artistId: string, locale: string) {
  const result = await payload.find({
    collection: 'repertoires',
    where: {
      artists: { equals: artistId },
    },
    locale,
    sort: 'order',
  })

  return result.docs
}
```

## Benefits

### 1. Performance

- Artist documents remain lightweight
- Repertoires loaded only when needed
- Pagination support for large repertoire lists

### 2. No Duplication

- Duo/ensemble repertoires stored once
- Linked to multiple artists via relationship field
- Single source of truth

### 3. Scalability

- No artificial limit (previously maxRows: 5)
- Can add unlimited repertoire sections per artist
- Independent querying and filtering

### 4. Better Management

- Edit repertoire independently
- Reusable across multiple artists (ensembles, duos)
- Track repertoire changes with versioning

### 5. Flexible Relationships

- Many-to-many relationship (artist ↔ repertoire)
- Supports complex scenarios:
  - Solo artist with multiple instruments
  - Chamber groups with shared repertoire
  - Conductors with orchestral repertoire

## Migration Strategy

### Phase 1: Collection Setup

1. Create `src/collections/Repertoires.ts`
2. Define schema with localized fields
3. Add to `payload.config.ts`

### Phase 2: Data Migration

1. Update/create `scripts/wordpress/migrateRepertoire.ts`:
   - Parse WordPress repertoire posts
   - Create Repertoire documents
   - Link to artist(s) via relationship field
   - Handle Duo case: link to both Thomas Zehetmair AND Ruth Killius
2. Run migration: `pnpm tsx scripts/wordpress/migrateRepertoire.ts`

### Phase 3: Service Layer

1. Create `src/services/repertoire.ts`:
   - `getRepertoiresByArtist(artistId, locale)`
   - `createRepertoire(data)`
   - `updateRepertoire(id, data)`

### Phase 4: Frontend Integration

1. Update `src/components/Artist/ArtistTabs.tsx`:
   - Fetch repertoires from new collection
   - Display in Repertoire tab
2. Create `src/components/Repertoire/RepertoireList.tsx`:
   - Display list of repertoire sections
   - Support localization
3. Update artist detail page to fetch repertoires

### Phase 5: Cleanup

1. Remove `repertoire` array field from `src/collections/Artists.ts`
2. Update TypeScript types (`src/payload-types.ts` regenerates automatically)
3. Remove old inline repertoire display components

## Data Mapping

### WordPress → Payload

| WordPress Field        | Payload Field            | Notes                                                    |
| ---------------------- | ------------------------ | -------------------------------------------------------- |
| `title`                | `title`                  | e.g., "Christian Zacharias – Repertoire Piano" → "Piano" |
| `content`              | `content`                | HTML → Lexical conversion                                |
| Category (artist name) | `artists` (relationship) | Find artist by name, link via ID                         |
| Locale (EN/DE)         | `locale`                 | Payload native localization                              |

### Special Cases

**Duo Repertoires:**

```javascript
// Input: "Duo Thomas Zehetmair & Ruth Killius – Repertoire"
// Output:
{
  title: { en: "Duo Repertoire", de: "Duo-Repertoire" },
  artists: [
    /* Thomas Zehetmair ID */,
    /* Ruth Killius ID */
  ],
  content: { /* HTML → Lexical */ }
}
```

**Multiple Sections per Artist:**

```javascript
// Christian Zacharias has 7 repertoire sections:
// - General
// - Piano
// - List Conductor
// - Klavier (DE)
// - Werkliste Dirigent (DE)

// Create 7 separate Repertoire documents, all linked to Christian Zacharias
```

## Example Migration Script Structure

```typescript
// scripts/wordpress/migrateRepertoire.ts

async function migrateRepertoire() {
  // 1. Load repertoire posts from WordPress XML
  const repEN = await loadPostsFromXML('all-en.xml', 'repertoire')
  const repDE = await loadPostsFromXML('all-de.xml', 'repertoire')

  // 2. Merge EN/DE by artist
  const merged = mergeLocalizedPosts(repEN, repDE)

  // 3. For each artist's repertoires
  for (const [artistName, posts] of merged) {
    // Handle Duo special case
    const artistIds = isDuo(artistName)
      ? await findArtistsByNames(['Thomas Zehetmair', 'Ruth Killius'])
      : await findArtistsByName(artistName)

    // 4. For each repertoire section
    for (const section of posts) {
      await payload.create({
        collection: 'repertoires',
        data: {
          title: { en: section.enTitle, de: section.deTitle },
          artists: artistIds,
          content: {
            en: htmlToLexical(section.enContent),
            de: htmlToLexical(section.deContent),
          },
          category: inferCategory(section.title),
          order: section.index,
        },
      })
    }
  }
}
```

## Frontend Display Example

```typescript
// src/app/[locale]/artists/[slug]/page.tsx

export default async function ArtistPage({ params }) {
  const artist = await getArtistBySlug(params.slug, params.locale)
  const repertoires = await getRepertoiresByArtist(artist.id, params.locale)

  return (
    <ArtistLayout artist={artist}>
      <ArtistTabs
        artist={artist}
        repertoires={repertoires} // Pass as prop
      />
    </ArtistLayout>
  )
}
```

## Testing Strategy

### Unit Tests

- Repertoire service layer CRUD operations
- Relationship resolution (artist ↔ repertoire)
- Localization handling

### Integration Tests

- Migration script with sample WordPress data
- Frontend display with test repertoires
- Duo/ensemble multi-artist linking

### Manual Testing

- Create repertoire via Payload admin
- Link to multiple artists
- Verify display on artist page
- Test localization (EN ↔ DE)

## Rollout Plan

1. **Development** (Week 1)
   - Create collection schema
   - Build service layer
   - Write migration script

2. **Testing** (Week 1)
   - Run migration on local database
   - Verify data integrity
   - Test frontend display

3. **Production Migration** (Week 2)
   - Backup production database
   - Run migration script
   - Verify all artists have repertoires
   - Deploy frontend changes

4. **Cleanup** (Week 2)
   - Remove old repertoire array field
   - Archive `migrateRepertoire.ts` (keep for reference)
   - Update documentation

## Open Questions

1. **Access Control:** Should repertoires have separate permissions, or inherit from artists?
2. **Versioning:** Do we need draft/published states for repertoires?
3. **Search:** Should repertoires be indexed in the search collection?
4. **API:** Do we need a public API endpoint for repertoires, or always fetch via artist?

## Files to Create/Modify

### New Files

- `src/collections/Repertoires.ts` - Collection schema
- `src/services/repertoire.ts` - Service layer
- `src/components/Repertoire/RepertoireList.tsx` - Display component
- `scripts/wordpress/migrateRepertoire.ts` - Migration script (already exists, needs update)

### Modified Files

- `src/collections/Artists.ts` - Remove inline repertoire field
- `src/payload.config.ts` - Add Repertoires collection
- `src/components/Artist/ArtistTabs.tsx` - Fetch from new collection
- `src/app/[locale]/artists/[slug]/page.tsx` - Pass repertoires as prop

## Success Criteria

- [ ] Repertoire collection created and configured
- [ ] All 32 EN + 32 DE repertoire posts migrated
- [ ] Duo repertoire correctly linked to both artists
- [ ] Frontend displays repertoires identically to before
- [ ] No performance degradation (should improve)
- [ ] Zero data loss during migration

## References

- WordPress migration script: `scripts/wordpress/migrateRepertoire.ts`
- Recording collection design: `docs/plans/2025-11-22-recording-collection-design.md`
- Artist collection: `src/collections/Artists.ts`
- WordPress data: `scripts/wordpress/data/all-en.xml`, `all-de.xml`
