# Recording Collection Implementation Plan

**Date:** 2025-11-22  
**Status:** Draft

## Overview

Implement a new `Recording` collection in Payload CMS to manage classical music recordings with artist relationships
that support multiple roles (e.g., conductor, pianist, ensemble member). Recordings will be displayed on the
"Recordings" tab of artist detail pages.

## Goals

- Create a Recording collection with comprehensive metadata fields
- Support complex artist-role relationships (one artist can have multiple roles on a recording)
- Enable public access for frontend display
- Integrate with existing Artists and Media collections
- Display recordings on artist detail pages in grid or list format

## Database Schema

### Collection: `recordings`

**Admin Configuration:**

- `useAsTitle`: `title`
- `group`: "Content Management"
- Access: Public read, authenticated create/update/delete (same pattern as Posts)

### Fields

#### Core Information

- **title** (text, required, localized)
  - The recording/album title

- **composer** (text, required, localized)
  - Composer name(s)

- **description** (richText, optional, localized)
  - General information about the recording
  - Can include: track listings, work details, program notes, etc.
  - No images or embedded media allowed (consistent with Artists repertoire/discography pattern)

#### Recording Metadata

- **recordingYear** (number, optional)
  - Year of recording (not release year)
  - Validation: min 1900, max current year + 1

- **recordingLabel** (text, optional)
  - Record label/publisher name

- **catalogNumber** (text, optional)
  - Label catalog number (e.g., "DG 479 5382")

#### Media

- **coverArt** (upload, relationTo: 'media', optional)
  - Album/recording cover image
  - Position: sidebar

#### Artist Relationships

- **artistRoles** (array, required)
  - Label: "Artists & Roles" (localized: de: "Künstler & Rollen")
  - Minimum 1 entry required
  - Fields per entry:
    - **artist** (relationship, relationTo: 'artists', required)
      - The performing artist
    - **role** (select, required, hasMany: true)
      - Options:
        - `soloist` (en: "Soloist", de: "Solist")
        - `conductor` (en: "Conductor", de: "Dirigent")
        - `ensemble_member` (en: "Ensemble Member", de: "Ensemblemitglied")
        - `chamber_musician` (en: "Chamber Musician", de: "Kammermusiker")
        - `accompanist` (en: "Accompanist", de: "Begleiter")
      - Allow multiple roles per artist (e.g., conductor + pianist)

## Implementation Steps

### 1. Create Constants File

**File:** `src/constants/recordingOptions.ts`

```typescript
export const RECORDING_ROLES = [
  { value: 'soloist', label: { en: 'Soloist', de: 'Solist' } },
  { value: 'conductor', label: { en: 'Conductor', de: 'Dirigent' } },
  { value: 'ensemble_member', label: { en: 'Ensemble Member', de: 'Ensemblemitglied' } },
  { value: 'chamber_musician', label: { en: 'Chamber Musician', de: 'Kammermusiker' } },
  { value: 'accompanist', label: { en: 'Accompanist', de: 'Begleiter' } },
] as const
```

### 2. Create Collection File

**File:** `src/collections/Recordings.ts`

- Import access controls from `@/access/authenticated` and `@/access/authenticatedOrPublished`
- Import `RECORDING_ROLES` from constants
- Define collection with all fields as specified above
- Use `authenticatedOrPublished` for read access (public when published)
- Use `authenticated` for create/update/delete
- Enable versions with drafts (same pattern as Posts)

### 3. Update Payload Config

**File:** `src/payload.config.ts`

- Import `Recordings` collection
- Add to collections array: `[Artists, Employees, Posts, Recordings, Users, Media]`

### 4. Add i18n Translations

**Files:** `src/i18n/de.ts` and `src/i18n/en.ts`

Add translations for:

- `custom:recordingRoles:soloist`
- `custom:recordingRoles:conductor`
- `custom:recordingRoles:ensemble_member`
- `custom:recordingRoles:chamber_musician`
- `custom:recordingRoles:accompanist`

### 5. Create Service Layer

**File:** `src/services/recording.ts`

Create functions:

- `getRecordingsByArtist(artistId: string, locale: string)` - Fetch recordings for a specific artist
- `getAllRecordings(locale: string)` - Fetch all published recordings
- Include artist population with roles

### 6. Frontend Components

#### a. RecordingCard Component

**File:** `src/components/Recording/RecordingCard.tsx`

Display:

- Cover art (with fallback)
- Recording title
- Composer
- Year and label
- Artist names with roles
- Description (truncated or expandable)

#### b. RecordingGrid Component

**File:** `src/components/Recording/RecordingGrid.tsx`

- Grid layout for multiple recordings
- Responsive design (similar to ArtistGrid pattern)

#### c. Empty State Component

**File:** `src/components/Recording/EmptyRecordings.tsx`

- Display when artist has no recordings
- Localized message

### 7. Update Artist Detail Page

**File:** `src/app/(frontend)/[locale]/artists/[slug]/page.tsx`

- Add "Recordings" tab to `ArtistTabs` component
- Fetch recordings using service layer
- Pass to `RecordingGrid` component

### 8. Update ArtistTabContent Component

**File:** `src/components/Artist/ArtistTabContent.tsx`

- Add case for 'recordings' tab
- Render `RecordingGrid` or `EmptyRecordings`

## Data Model Example

```typescript
{
  title: "Mozart: Piano Concertos Nos. 20 & 27",
  composer: "Wolfgang Amadeus Mozart",
  description: "<p>Piano Concerto No. 20 in D minor, K. 466</p><p>Piano Concerto No. 27 in B-flat major, K. 595</p><p>Recorded live at Salle Métropole, Lausanne, September 2018</p>",
  recordingYear: 2019,
  recordingLabel: "Deutsche Grammophon",
  catalogNumber: "DG 479 5382",
  coverArt: { relationTo: 'media', value: '...' },
  artistRoles: [
    {
      artist: { relationTo: 'artists', value: 'christian-zacharias' },
      role: ['conductor', 'soloist']
    },
    {
      artist: { relationTo: 'artists', value: 'lausanne-chamber-orchestra' },
      role: ['ensemble_member']
    }
  ],
  _status: 'published'
}
```

## Design Decisions

### Why Array of Artist-Role Objects?

- Allows one artist to have multiple roles on same recording
- Maintains clear relationship between artist and their specific role(s)
- Easier to query "all recordings where Artist X is conductor"
- More flexible than separate relationship fields per role

### Why No Slug?

- Recordings are not primary navigation destinations
- They exist as related content on artist pages
- Reduces complexity and maintains focus on artists as main entities

### Why Localized Title/Composer?

- Composer names may have different conventions (e.g., Tchaikovsky vs Tschaikowsky)
- Recording titles may be translated
- Maintains consistency with existing collection patterns

### Why Single Title Field?

- Simplifies data entry
- Most recordings have one primary title
- Title can include work numbers/details (e.g., "Mozart: Piano Concertos Nos. 20 & 27")

### Why RichText Description?

- Flexible content for various use cases: track listings, work details, program notes
- Allows formatting (lists, paragraphs, bold/italic)
- Consistent with Artists collection pattern (repertoire, discography fields)
- No embedded media keeps content focused on text information

## Testing Checklist

- [ ] Create recording via Payload admin
- [ ] Add multiple artists with different roles
- [ ] Add same artist with multiple roles
- [ ] Add description with track listings
- [ ] Verify public read access (unauthenticated)
- [ ] Query recordings by artist via service layer
- [ ] Display recordings on artist detail page
- [ ] Test empty state (artist with no recordings)
- [ ] Verify localization (DE/EN)
- [ ] Test draft/published workflow
- [ ] Verify cover art uploads and display

## Future Enhancements (Out of Scope)

- Audio file uploads/streaming links
- Purchase links (Spotify, Apple Music, etc.)
- Reviews/press quotes
- Filtering by label, year, or role
- Dedicated recordings list page
- Search functionality

## Dependencies

- Existing: Artists collection
- Existing: Media collection
- Existing: Access control patterns
- Existing: i18n infrastructure

## Estimated Complexity

**Medium** - Straightforward collection setup with moderately complex artist-role relationships. Main complexity is in
the array field structure and frontend display logic.

## Data Migration

### Migration Script

**File:** `scripts/migrateDiscographyToRecordings.ts`

This script will migrate existing discography data from the Artists collection to the new Recordings collection.

#### Strategy

Since the existing `discography` field is unstructured richText, the migration will be **semi-automated**:

1. **Extract** discography data from all Artists
2. **Parse** the richText structure to identify potential recording entries
3. **Create** draft Recordings with:
   - Pre-populated artist relationship (from source artist)
   - Description field populated with the original richText content
   - Title, composer, and other metadata fields left empty for manual completion
   - Default role set to 'soloist' (can be adjusted in admin)
4. **Output** a migration report showing what was created

#### Manual Post-Migration Steps

After running the script, content creators will need to:

1. Review each draft Recording
2. Extract and populate structured fields (title, composer, year, label, catalog number)
3. Clean up description field to remove redundant metadata
4. Adjust artist roles as needed
5. Add cover art
6. Publish when complete

#### Script Structure

```typescript
import 'dotenv/config'
import { getPayload } from 'payload'

async function migrateDiscography() {
  const configModule = await import('../src/payload.config')
  const config = configModule.default
  const payload = await getPayload({ config })

  // 1. Fetch all artists with discography data
  const artists = await payload.find({
    collection: 'artists',
    where: {
      discography: { exists: true },
    },
    limit: 1000,
  })

  let createdCount = 0
  let skippedCount = 0

  for (const artist of artists.docs) {
    if (!artist.discography) {
      skippedCount++
      continue
    }

    console.log(`Processing ${artist.name}...`)

    // Create a draft recording with the discography content
    await payload.create({
      collection: 'recordings',
      data: {
        title: `${artist.name} - Discography (needs review)`,
        composer: 'To be determined',
        description: artist.discography, // Preserve original richText
        artistRoles: [
          {
            artist: artist.id,
            role: ['soloist'], // Default role
          },
        ],
        _status: 'draft',
      },
    })

    createdCount++
  }

  console.log('\n=== Migration Complete ===')
  console.log(`Created: ${createdCount} draft recordings`)
  console.log(`Skipped: ${skippedCount} artists (no discography)`)
  console.log('\nNext steps:')
  console.log('1. Review draft recordings in Payload admin')
  console.log('2. Parse and populate structured metadata fields')
  console.log('3. Clean up description fields')
  console.log('4. Publish when ready')

  process.exit(0)
}

migrateDiscography().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

#### Package.json Script

Add to `package.json`:

```json
"migrate:discography": "tsx scripts/migrateDiscographyToRecordings.ts"
```

#### Usage

```bash
pnpm migrate:discography
```

#### Migration Considerations

**Pros of this approach:**

- Preserves all existing discography data
- Creates traceable draft entries for review
- Allows content creators to properly structure the data
- No data loss risk

**Cons:**

- Requires manual cleanup work
- Not fully automated

**Alternative approach (not recommended):**

- Attempt to parse richText paragraphs programmatically to extract composer, title, catalog numbers
- High risk of incorrect parsing due to inconsistent formatting
- Better to have humans review and structure the data properly

#### Post-Migration Cleanup (Optional)

After all recordings are migrated and published, optionally:

1. Clear the `discography` field from Artists collection
2. Or deprecate the field in a future schema update
