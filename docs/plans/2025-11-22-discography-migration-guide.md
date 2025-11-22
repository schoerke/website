# Discography to Recordings Migration Guide

**Date:** 2025-11-22  
**Status:** Ready for Migration  
**Related ADRs:** [2025-11-22-recording-collection-design.md](2025-11-22-recording-collection-design.md)

## Overview

This guide outlines how to format the Artist Collection's "Discography" field to ensure successful migration to the new
Recordings collection.

## Discography Field Format Requirements

### Basic Structure

The discography field uses **Rich Text** format with the following structure:

```
[H1 Heading] Role Name
[Paragraph] Recording 1
[Paragraph] Recording 2
...

[H1 Heading] Another Role Name
[Paragraph] Recording 1
[Paragraph] Recording 2
```

### 1. Role Headings (H1)

**Purpose:** Group recordings by the artist's role

**Supported roles (case-insensitive, bilingual):**

| English          | German           | Role Value         |
| ---------------- | ---------------- | ------------------ |
| Soloist          | Solist           | `soloist`          |
| Conductor        | Dirigent         | `conductor`        |
| Accompanist      | Begleiter        | `accompanist`      |
| Chamber Musician | Kammermusiker    | `chamber_musician` |
| Ensemble Member  | Ensemblemitglied | `ensemble_member`  |

**Example:**

```
# Soloist
[recordings...]

# Conductor
[recordings...]
```

### 2. Recording Paragraphs

Each paragraph represents one recording and should contain:

#### Components (in order):

1. **Composer (Optional - Bold text)**
   - Format: Bold text
   - Example: **Bach**
   - Will be prepended to title as "Composer - Work"

2. **Title (Normal or Italic text)**
   - Format: Normal or italic text
   - Example: Partita in A minor, French Suites BWV 813, 814 & 816
   - Can include multiple parts

3. **Description (Optional - Normal text)**
   - Format: Normal text
   - Additional work details, track listings, etc.
   - Text starting with "Partner:" will have the prefix removed automatically

4. **Label & Catalog Number (Italic or Normal text)**
   - Format: Last italic text or last normal text in paragraph
   - Pattern: `LABEL CATALOG (YEAR)` or `LABEL CATALOG FORMAT (YEAR)`
   - Examples:
     - `MDG 903 2280-6 SACD (2023)`
     - `EMI 7 41112 7 (2000)`
     - `Naxos 8.572191`

#### Text Formatting Reference:

- **Bold (format: 1):** Composer name
- **Normal (format: 0):** Title, description, partner info, or label/catalog
- **Italic (format: 2):** Work titles or label/catalog info

### 3. Complete Examples

#### Example 1: Solo Recording (German)

```
# Solist

**Bach** - Partita in a-moll, Französische Suiten BWV 813, 814 & 816
_MDG 903 2280-6 SACD (2023)_
```

**Parsed as:**

- Title: "Bach - Partita in a-moll, Französische Suiten BWV 813, 814 & 816"
- Label: MDG
- Catalog: 903 2280-6
- Year: 2023
- Role: soloist

#### Example 2: Concerto with Orchestra (English)

```
# Soloist

**Mozart** Vol. 9 - Piano Concertos A major K 414 and D major K 537
Partner: Orchestre de Chambre de Lausanne
_MDG 940 1759-6 (2012)_
```

**Parsed as:**

- Title: "Mozart - Vol. 9 - Piano Concertos A major K 414 and D major K 537"
- Description: "Orchestre de Chambre de Lausanne" (Partner: removed)
- Label: MDG
- Catalog: 940 1759-6
- Year: 2012
- Role: soloist

#### Example 3: Conductor Role (German)

```
# Dirigent

**Schumann** - Sinfonie Nr. 1 B-Dur op. 38
Sinfonie Nr. 3 Es-Dur op. 97 "Rheinische"
Partner: Orchestre de Chambre de Lausanne
_MDG 940 1772-6 (2012)_
```

**Parsed as:**

- Title: "Schumann - Sinfonie Nr. 1 B-Dur op. 38"
- Description: "Sinfonie Nr. 3 Es-Dur op. 97 "Rheinische", Orchestre de Chambre de Lausanne"
- Label: MDG
- Catalog: 940 1772-6
- Year: 2012
- Role: conductor

#### Example 4: Chamber Music

```
# Chamber Musician

**Schubert** - Piano Quintet A major D 667 (Trout Quintet)
Partner: Leipzig String Quartet
_MDG 307 0625-2 (1998)_
```

**Parsed as:**

- Title: "Schubert - Piano Quintet A major D 667 (Trout Quintet)"
- Description: "Leipzig String Quartet"
- Label: MDG
- Catalog: 307 0625-2
- Year: 1998
- Role: chamber_musician

## Label/Catalog Format Patterns

The migration script recognizes these patterns:

| Pattern                       | Example                      | Extracted                                   |
| ----------------------------- | ---------------------------- | ------------------------------------------- |
| `LABEL CATALOG (YEAR)`        | `MDG 940 1759-6 (2012)`      | Label: MDG, Catalog: 940 1759-6, Year: 2012 |
| `LABEL CATALOG FORMAT (YEAR)` | `MDG 903 2280-6 SACD (2023)` | Label: MDG, Catalog: 903 2280-6, Year: 2023 |
| `LABEL CATALOG`               | `Naxos 8.572191`             | Label: Naxos, Catalog: 8.572191, Year: null |
| `LABEL CATALOG FORMAT`        | `EMI 5 56489 2 Hybrid-SACD`  | Label: EMI, Catalog: 5 56489 2, Year: null  |

**Important:** The label/catalog line should be the **last text element** in the paragraph (either italic or normal
text).

## Localization

### Both Locales (DE & EN)

Artists with discography in **both German and English** locales:

1. Each locale is processed independently
2. Recordings are matched by position within role groups
3. DE and EN titles/descriptions are stored separately
4. Label, catalog, year, and artist roles are non-localized (same in both)

**Example:**

**German Discography:**

```
# Solist
**Bach** - Partita in a-moll
_MDG 903 2280-6 (2023)_
```

**English Discography:**

```
# Soloist
**Bach** - Partita in A minor
_MDG 903 2280-6 (2023)_
```

**Result:** One recording with:

- DE title: "Bach - Partita in a-moll"
- EN title: "Bach - Partita in A minor"
- Label/Catalog/Year: Same in both locales

### Single Locale

If only one locale has discography:

- The other locale will receive a copy of the content
- Both locales will have identical titles/descriptions

## Running the Migration

### Prerequisites

1. Clean git working directory (commit or stash changes)
2. Environment variables configured (`.env` file)
3. Next.js dev server running (port 3000)

### Migration Commands

**Normal mode (skip artists with existing recordings):**

```bash
pnpm tsx scripts/migrateDiscographyToRecordings.ts
```

**Force mode (create recordings even if they exist):**

```bash
pnpm tsx scripts/migrateDiscographyToRecordings.ts --force
```

**Preview (dry-run for Christian Zacharias):**

```bash
pnpm tsx scripts/previewChristianZacharias.ts
```

### Migration Behavior

**Idempotent (default mode):**

- Checks for existing recordings before processing each artist
- Skips artists that already have recordings
- Safe to re-run after manual edits

**Force mode:**

- Bypasses duplicate check
- Creates recordings even if they exist
- **Warning:** May create duplicates

### Output

The migration script logs:

- Artists processed
- Number of recordings created per artist
- Role assignments
- Label, catalog, and year for each recording
- Any errors encountered

**Example output:**

```
📝 Processing: Christian Zacharias
   Instruments: conductor, piano

   🎵 Processing 54 recording(s) as: soloist

      → DE: "Bach - Partita in a-moll, Französische Suiten BWV 813, 814 & 816"
         Label: MDG 903 2280-6
         Year: 2023
         EN: "Bach - Partita in A minor, French Suites BWV 813, 814 & 816"

   ✅ Created 54 draft recording(s)
```

## Validation Checklist

Before running the migration, verify:

- [ ] All role headings use H1 format
- [ ] Role names match supported values (case-insensitive)
- [ ] Each recording is in a separate paragraph
- [ ] Label/catalog info is at the end of each paragraph
- [ ] "Partner:" text is used consistently (will be auto-removed)
- [ ] Year is in parentheses: `(YYYY)`
- [ ] Both DE and EN locales are formatted consistently (if both exist)

## Troubleshooting

### Recording not created

**Check:**

- Is there an H1 heading with a valid role name above the paragraph?
- Does the paragraph contain actual text content?
- Is the artist already processed? (remove `--force` to bypass)

### Label/catalog not extracted

**Check:**

- Is the label/catalog text the **last element** in the paragraph?
- Does it match the pattern: `LABEL CATALOG` with optional `(YEAR)`?
- Label should start with a capital letter
- Catalog should contain digits, dots, spaces, or dashes

### Year not extracted

**Check:**

- Is the year in parentheses? `(2023)`
- Is it a 4-digit year? (1900-current year+1)
- Is it at the end of the label/catalog line?

### Wrong role assigned

**Check:**

- Is there an H1 heading above the recordings?
- Does it match one of the supported role names exactly? (case-insensitive)
- Role headings must use **H1** format (not H2, H3, etc.)

### "Partner:" still appears in description

**This is unexpected** - the script automatically removes "Partner: " prefix.

- Verify you're running the latest version of the migration script
- Check if "Partner:" has unusual spacing or special characters

## Post-Migration

After migration:

1. **Review draft recordings** in Payload CMS admin
2. **Verify** titles, descriptions, labels, catalogs, years
3. **Check** both DE and EN locales
4. **Publish** approved recordings (change status from draft to published)
5. **Test** frontend display on artist detail pages

## Related Files

- Migration Script: `scripts/migrateDiscographyToRecordings.ts`
- Preview Script: `scripts/previewChristianZacharias.ts`
- Recording Collection: `src/collections/Recordings.ts`
- Recording Options: `src/constants/recordingOptions.ts`
- Service Layer: `src/services/recording.ts`
- Frontend Components:
  - `src/components/Recording/RecordingCard.tsx`
  - `src/components/Recording/RecordingGrid.tsx`
  - `src/components/Artist/ArtistTabs.tsx` (displays recordings in Discography tab)

## Support

For issues or questions:

- Review the migration script logs for detailed error messages
- Check `scripts/migrateDiscographyToRecordings.ts` header comments for examples
- Test with preview script first: `pnpm tsx scripts/previewChristianZacharias.ts`
