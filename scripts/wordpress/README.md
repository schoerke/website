# WordPress to Payload CMS Migration Scripts

This directory contains scripts for migrating content from WordPress XML exports to Payload CMS.

## Prerequisites

### 1. Export WordPress Content

Export **ALL content** from both WordPress instances (not individual post types):

**English Site:**

- Go to: Tools > Export
- Select: **"All content"**
- Download: Save as `scripts/wordpress/data/all-en.xml`

**German Site:**

- Go to: Tools > Export
- Select: **"All content"**
- Download: Save as `scripts/wordpress/data/all-de.xml`

> **Note:** The "all content" export includes everything: artists, employees, posts, pages, media attachments, etc. Our
> scripts filter for the specific post types they need.

### 2. Download Media Files

```bash
# Extract media URLs from WordPress exports
pnpm tsx scripts/wordpress/utils/extractMediaUrls.ts

# Download all media files locally using curl (bypasses Node.js SSL issues)
cd scripts/wordpress/utils
./downloadMedia.sh
```

This downloads ~68 files (images, PDFs, ZIPs) to `scripts/wordpress/data/downloaded-media/`

## Migration Order

Run migrations in this order to maintain referential integrity:

### 1. Upload Media Files

```bash
pnpm tsx scripts/wordpress/utils/uploadLocalMedia.ts
```

**What it does:**

- Uploads all local media files to Payload CMS
- Creates `media-id-map.json` mapping filenames to Payload media IDs
- Stores files locally (R2 storage temporarily disabled)

**Output:**

- 66-68 media records created
- `scripts/wordpress/data/media-id-map.json` generated

### 2. Migrate Employees

```bash
pnpm payload run scripts/wordpress/migrateEmployees.ts
```

**What it does:**

- Parses employee data from `all-en.xml` and `all-de.xml`
- Filters for `post_type = 'employee'`
- Creates localized employee records (EN + DE)
- Resolves media relationships

**Data migrated:**

- Names, titles (EN/DE)
- Email, phone, mobile
- Display order
- Profile images

### 3. Migrate Artists

```bash
pnpm tsx scripts/wordpress/migrateArtists.ts

# With options:
pnpm tsx scripts/wordpress/migrateArtists.ts --dry-run    # Preview only
pnpm tsx scripts/wordpress/migrateArtists.ts --verbose    # Detailed output
```

**What it does:**

- Parses artist data from `all-en.xml` and `all-de.xml`
- Filters for `post_type = 'artist'`
- Creates localized artist records (EN + DE)
- Converts HTML to Lexical rich text
- Resolves media and employee relationships

**Data migrated:**

- Names, slugs, instruments
- Profile images (checks both `_thumbnail_id` and `artist_secondary-image_thumbnail_id`)
- Biographies (EN/DE) with rich text conversion
- Featured quotes
- Biography PDFs (EN/DE)
- Gallery ZIPs (EN/DE)
- Social media links
- Contact persons (employee relationships)
- External concert calendar URLs

## Helper Modules

### `helpers/xmlParser.ts`

Utilities for parsing WordPress XML exports:

- `parseWordPressXML()` - Parse XML file to items array
- `parsePostMeta()` - Convert postmeta array to key-value object
- `cleanBiographyHTML()` - Strip WordPress-specific HTML artifacts
- `extractFirstParagraph()` - Get first paragraph for featured quotes

### `helpers/lexicalConverter.ts`

HTML to Lexical rich text conversion:

- `htmlToLexical()` - Convert HTML strings to Lexical JSON format
- Handles paragraphs, headings, lists, links, emphasis

### `helpers/fieldMappers.ts`

Field mapping and validation:

- `mapInstruments()` - Map WordPress instrument names to Payload taxonomy
- `findEmployeeByName()` - Resolve employee relationships
- `validateAndCleanURL()` - Sanitize and validate URLs

## File Structure

```
scripts/wordpress/
├── data/
│   ├── all-en.xml                    # Full WordPress export (EN) ← REQUIRED
│   ├── all-de.xml                    # Full WordPress export (DE) ← REQUIRED
│   ├── media-urls.json               # Generated: List of media URLs to download
│   ├── media-id-map.json             # Generated: Filename → Payload ID mapping
│   └── downloaded-media/             # Temporary: Downloaded files (deleted after upload)
├── utils/
│   ├── xmlParser.ts                  # WordPress XML parsing utilities
│   ├── lexicalConverter.ts           # HTML → Lexical conversion
│   ├── fieldMappers.ts               # Field mapping & validation
│   ├── extractMediaUrls.ts           # Step 1: Extract media URLs from XML
│   ├── downloadMedia.sh              # Step 2: Download media via curl
│   └── uploadLocalMedia.ts           # Step 3: Upload media to Payload
├── migrateEmployees.ts               # Step 4: Migrate employees
├── migrateArtists.ts                 # Step 5: Migrate artists
└── README.md                         # This file
```

## Troubleshooting

### SSL/TLS Errors with Node.js

If you encounter SSL errors when downloading media:

- Use the `utils/downloadMedia.sh` script (uses `curl` instead of Node.js)
- Curl bypasses Node.js SSL certificate issues

### Missing Artist Images

If an artist is missing their profile image:

- Check both `_thumbnail_id` and `artist_secondary-image_thumbnail_id` fields
- Some artists use the secondary image field only (e.g., Tianwa Yang)
- The `utils/extractMediaUrls.ts` script now checks both fields

### R2 Storage Issues

We temporarily disabled Cloudflare R2 storage due to AWS SDK compatibility issues:

- Media files are stored locally during migration
- Files can be manually synced to R2 later using `rclone` or Cloudflare CLI
- Re-enable R2 by uncommenting `s3Storage()` in `src/payload.config.ts`

### Dry Run Mode

Test migrations without making changes:

```bash
pnpm tsx scripts/wordpress/migrateArtists.ts --dry-run
```

## Post-Migration Cleanup

After successfully migrating all data, you can safely remove temporary files:

```bash
# Remove downloaded media (already uploaded to Payload - saves 737MB)
rm -rf scripts/wordpress/data/downloaded-media

# These folders are already in .gitignore
```

**What to keep:**

- ✅ `all-en.xml` and `all-de.xml` - Source data for re-running migrations
- ✅ `media-id-map.json` - Filename to Payload ID mapping
- ✅ `media-urls.json` - List of media URLs (can regenerate if needed)

**What can be deleted:**

- ❌ `downloaded-media/` - Temporary download folder (737MB)
- ❌ Individual post type XML exports (replaced by all-\*.xml)

## Migration Statistics (November 2025)

**Successfully migrated:**

- ✅ 4 employees (EN + DE)
- ✅ 22 artists (EN + DE) - Claire Huangci had validation errors
- ✅ 66 media files (2 corrupt files skipped)
- ✅ All media relationships resolved
- ✅ All localized content preserved

**Known Issues:**

- Claire Huangci: Featured Quote validation error (requires manual fix)
- 2 corrupt ZIP files: `GR_Galerie_2017.zip`, `ST_Bio_e.pdf`

## Development Notes

### Why Use `all-*.xml` Instead of Individual Exports?

WordPress offers both "All content" and individual post type exports. We use "All content" because:

1. **Complete data:** Includes all post types, media attachments, and relationships
2. **Single source of truth:** One file per language instead of multiple
3. **Media resolution:** Attachment metadata is in the same file
4. **Simpler maintenance:** Update one export instead of multiple

The scripts filter for specific post types (`'artist'`, `'employee'`) when parsing.

### TypeScript Interfaces

Added `'wp:post_type': string` to `WordPressItem` interface in `helpers/xmlParser.ts` to support filtering by post type.
