# Repertoire Field Refactoring Migration Guide

## Overview

This guide describes the migration from the old single `repertoire` richText field to the new array-based structure with
multiple sections.

## Changes Made

### Schema Changes (src/collections/Artists.ts)

- **OLD**: `repertoire` - single richText field (localized)
- **NEW**: `repertoire` - array field (localized) containing:
  - `title` (text, required, localized): Section title (e.g., "Solo Repertoire", "Chamber Music")
  - `content` (richText, required, localized): List of works in this section

### Safety Measures

1. ✅ **Backup created**: `data/dumps/artists-repertoire-backup-2025-11-24.json`
2. ✅ **Migration script created**: `scripts/migrateRepertoireStructure.ts`
3. ✅ **Schema updated**: Artists collection now uses array structure

## Migration Status

### Current State

- **Schema**: ✅ Updated in code
- **Database**: ⚠️ NOT YET UPDATED (requires schema push)
- **Data**: ⚠️ NOT YET MIGRATED

### Data in Database

- Total artists: 1 (Christian Zacharias)
- Artists with repertoire data: 1 (has empty paragraph only)
- **Data loss risk**: MINIMAL (only empty content exists)

## Migration Steps

### Option 1: Safe Migration (Recommended)

Since the current repertoire data is empty (only contains empty paragraphs), the safest approach is:

1. **Accept the schema change** - The data being deleted is only an empty paragraph
2. **The database will automatically handle the migration** to the new structure
3. **Users can add new repertoire sections** through the CMS using the new array structure

```bash
# When you next start the dev server or run a Payload command,
# accept the schema push when prompted with 'y'
```

### Option 2: Manual Migration (If Needed Later)

If you have artists with actual repertoire content in the future:

```bash
# 1. Dry run to preview changes
pnpm tsx scripts/migrateRepertoireStructure.ts

# 2. Apply migration
pnpm tsx scripts/migrateRepertoireStructure.ts --apply
```

The migration script will:

- Check for backup file existence
- Transform old richText content into array with single section
- Preserve localized content (de/en)
- Skip artists with empty repertoire
- Provide detailed output of changes

## Rollback Plan

If issues occur, restore from backup:

```bash
# The backup file contains the old structure
# You would need to:
# 1. Revert the schema changes in src/collections/Artists.ts
# 2. Push the old schema
# 3. Restore data from backup file
```

## Next Steps

1. ✅ Schema is ready for the new structure
2. ⏭️ Accept the schema push when prompted
3. ⏭️ Test the new array structure in the CMS admin panel
4. ⏭️ Verify artists can add multiple repertoire sections

## Notes

- The new structure allows artists to organize repertoire into multiple sections
- Each section can have its own title (e.g., "Solo", "Chamber", "Orchestral")
- This matches the pattern used for discography (array of role sections)
- All fields are localized (supports both German and English)
