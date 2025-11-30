# Archived Database Scripts

These scripts are no longer actively used but are preserved for reference.

## Why Archived?

**Single Source of Truth:** WordPress XML files are the authoritative source for all data. Instead of maintaining separate seed/restore scripts, we use WordPress migration scripts directly.

## Archived Scripts

### Seed Scripts (Synthetic Test Data)
- `seedAll.ts` - Master orchestration for all seed scripts
- `seedArtists.ts` - Creates sample artists with generic bios
- `seedMedia.ts` - Uploads static assets (logo, avatar)
- `seedPosts.ts` - Creates sample blog posts
- `seedStaticPages.ts` - Creates sample pages

**Replacement:** Use WordPress migration scripts instead:
```bash
pnpm migrate:artists
pnpm migrate:employees
pnpm migrate:posts
```

### Restore Scripts (Production Data from JSON Dumps)
- `restoreArtistsDump.ts` - Restores artists from JSON dump
- `restorePostsDump.ts` - Restores posts from JSON dump
- `restoreDiscography.ts` - Restores discography from JSON dump
- `restoreAndTransformDiscography.ts` - Transforms old discography structure

**Replacement:** Export dumps from WordPress, then use migration scripts:
```bash
# No need for intermediate dumps - migrate directly from WordPress XML
pnpm migrate:artists
```

## Active Scripts (Still in Use)

These scripts remain in `scripts/db/`:
- `dumpCollection.ts` - Export any collection to JSON (backup utility)
- `migrateMediaToR2.ts` - Storage migration utility (for R2 → Vercel Blob)
- `json/artists.json` - Sample artist data (for development only)

## If You Need These Scripts

If you need to resurrect any of these scripts:
1. Move them back to `scripts/db/`
2. Update collection references from 'media' to 'images' or 'documents'
3. Test thoroughly before using in production
