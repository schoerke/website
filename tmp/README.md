# WordPress to Payload CMS Migration Toolkit

**Complete, production-ready migration scripts for importing artist data from WordPress into Payload CMS.**

## 📦 What's Included

This toolkit provides everything you need to migrate artist data safely and reliably:

### Core Scripts

| Script                       | Purpose                | Usage                                                 |
| ---------------------------- | ---------------------- | ----------------------------------------------------- |
| **`migrateArtists.ts`**      | Main migration engine  | `pnpm exec tsx tmp/migrateArtists.ts`                 |
| **`inspectWordPressXML.ts`** | XML structure analyzer | `pnpm exec tsx tmp/inspectWordPressXML.ts <file.xml>` |
| **`generateSampleXML.ts`**   | Test data generator    | `pnpm exec tsx tmp/generateSampleXML.ts`              |

### Documentation

| Document                  | Description                           |
| ------------------------- | ------------------------------------- |
| **`QUICKSTART.md`**       | 5-minute quick start guide            |
| **`MIGRATION_README.md`** | Comprehensive migration documentation |
| **`README.md`**           | This file (overview)                  |

## ✨ Features

### Migration Capabilities

- ✅ **XML Parsing** - Robust WordPress XML export parsing
- ✅ **Field Mapping** - Automatic WordPress → Payload schema mapping
- ✅ **Media Resolution** - Links WordPress media IDs to Payload media
- ✅ **Localization** - Supports EN/DE localized content
- ✅ **Rich Text** - Transforms HTML to Lexical format
- ✅ **Validation** - URL and field validation
- ✅ **Dry Run Mode** - Preview changes before applying
- ✅ **Progress Tracking** - Real-time migration status
- ✅ **Error Handling** - Comprehensive error reporting
- ✅ **Update Support** - Updates existing artists instead of duplicating

### Safety Features

- 🛡️ **Database verification** - Confirms target database before migration
- 🛡️ **Backup prompts** - Reminds to backup before running
- 🛡️ **Dry-run default** - Test mode available for all operations
- 🛡️ **Rollback support** - Can restore from dumps
- 🛡️ **Status filtering** - Skips WordPress drafts automatically
- 🛡️ **Error isolation** - One failed artist doesn't stop entire migration

## 🚀 Quick Start

**1. Generate sample data and test:**

```bash
pnpm exec tsx tmp/generateSampleXML.ts
pnpm exec tsx tmp/migrateArtists.ts --file=tmp/sample-artists.xml --dry-run
```

**2. Analyze your WordPress export:**

```bash
pnpm exec tsx tmp/inspectWordPressXML.ts scripts/wordpress/data/artists.xml
```

**3. Run migration:**

```bash
# Dry run first!
pnpm exec tsx tmp/migrateArtists.ts --dry-run --verbose

# Then for real
pnpm exec tsx tmp/migrateArtists.ts
```

**For detailed instructions, see: [`QUICKSTART.md`](./QUICKSTART.md)**

## 📋 Prerequisites

Before migrating artists, ensure:

- [ ] WordPress XML export obtained (`Tools → Export → Artists`)
- [ ] Media already migrated (`pnpm migrate:media`)
- [ ] Database backup created (`pnpm dump:artists`)
- [ ] Database configuration verified (`.env` DATABASE_URI)
- [ ] Dependencies installed (`pnpm install`)

## 🗂️ Project Integration

These scripts are currently in the `tmp/` folder for testing. After successful migration:

### Make Permanent

```bash
# Move to permanent location
mv tmp/migrateArtists.ts scripts/wordpress/
mv tmp/inspectWordPressXML.ts scripts/wordpress/

# Add to package.json
{
  "scripts": {
    "migrate:artists": "tsx scripts/wordpress/migrateArtists.ts",
    "inspect:xml": "tsx scripts/wordpress/inspectWordPressXML.ts"
  }
}
```

### Keep as Reference

```bash
# Move documentation to docs/
mv tmp/MIGRATION_README.md docs/plans/wordpress-artist-migration-guide.md

# Delete temporary files
rm tmp/generateSampleXML.ts
rm tmp/sample-artists.xml
rm tmp/QUICKSTART.md
rm tmp/README.md
```

## 📊 Migration Output

Example successful migration:

```
🚀 WordPress Artist Migration

Mode: LIVE
XML: scripts/wordpress/data/artists.xml

✅ Payload initialized

📊 Found 47 artists to migrate

[1/47] Processing: Maria Schmidt
✅ Created: Maria Schmidt

[2/47] Processing: Johannes Müller
✅ Created: Johannes Müller

[3/47] Processing: Anna Weber
⏭️  Skipping Anna Weber (status: draft)

...

============================================================
MIGRATION SUMMARY
============================================================
Total:   47
Created: 42
Updated: 3
Skipped: 2
Failed:  0

✅ Migration complete!
```

## 🎯 Field Mapping

How WordPress fields map to Payload CMS:

| WordPress            | Payload        | Transform      |
| -------------------- | -------------- | -------------- |
| `title`              | `name`         | Direct         |
| `wp:post_name`       | `slug`         | Direct         |
| `content:encoded`    | `biography`    | HTML → Lexical |
| `_thumbnail_id`      | `image`        | Media lookup   |
| `artist_instruments` | `instrument`   | Array mapping  |
| `quote`              | `quote`        | Direct         |
| `homepage_url`       | `homepageURL`  | Validation     |
| `facebook_url`       | `facebookURL`  | Validation     |
| `instagram_url`      | `instagramURL` | Validation     |

**Note:** Field names may differ in your WordPress setup. Use the inspector tool to verify.

## 🔧 Customization

### Custom WordPress Fields

If your WordPress uses different field names:

1. Run inspector to identify field names:

   ```bash
   pnpm exec tsx tmp/inspectWordPressXML.ts your-export.xml
   ```

2. Edit `tmp/migrateArtists.ts` → `mapArtistData()` function:
   ```typescript
   // Update to match your field names
   const instrumentField = meta['your_instrument_field']
   ```

### Extending Migration

Add custom fields or relationships:

```typescript
// In mapArtistData() function
async function mapArtistData(wpArtist: WordPressArtist, payload: any): Promise<PayloadArtistData> {
  // ... existing code ...

  // Add custom field mapping
  if (meta['custom_field']) {
    artistData.customField = transformCustomField(meta['custom_field'])
  }

  return artistData
}
```

## 🐛 Troubleshooting

### Common Issues

**"Media not found"**

- Ensure media migrated first: `pnpm migrate:media`
- Update `findMediaId()` to match your media ID strategy

**"Biography is empty"**

- Check WordPress field name with inspector
- Verify HTML-to-Lexical transformation works

**"Invalid instrument value"**

- Check valid values in `src/constants/options.ts`
- Add value mapping in `mapInstruments()`

**"Slug already exists"**

- This is expected behavior (migration updates existing artists)
- To create duplicates instead, modify `migrateArtist()` logic

For more troubleshooting, see [`MIGRATION_README.md`](./MIGRATION_README.md).

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[MIGRATION_README.md](./MIGRATION_README.md)** - Complete guide (advanced usage, customization, troubleshooting)
- **Payload CMS Docs** - https://payloadcms.com/docs
- **WordPress Export** - https://wordpress.org/support/article/tools-export-screen/

## 🔐 Database Safety

**CRITICAL: These scripts follow strict database protection policies:**

1. **Always verify** database configuration before running
2. **Never assume** local vs remote database
3. **Always backup** before migrations
4. **Test with --dry-run** first
5. **Confirm explicitly** before writing to database

These scripts will:

- ✅ Check `.env` for DATABASE_URI
- ✅ Support dry-run mode for testing
- ✅ Provide detailed output before changes
- ✅ Report errors without stopping entire migration

But YOU must:

- ⚠️ Verify which database you're targeting
- ⚠️ Create backups before running
- ⚠️ Review dry-run output before proceeding

## 🤝 Contributing

If you find bugs or want to extend the scripts:

1. Test changes with sample data first
2. Update documentation to reflect changes
3. Add error handling for edge cases
4. Follow project code style (Prettier, ESLint)

## 📝 License

Same as parent project (MIT).

## 🎉 What's Next?

After successfully migrating artists:

1. ✅ Migrate recordings/discography
2. ✅ Migrate posts/news articles
3. ✅ Set up media galleries
4. ✅ Configure relationships (artists ↔ recordings)
5. ✅ Test frontend display
6. ✅ Deploy to production

---

**Need help?** Start with [`QUICKSTART.md`](./QUICKSTART.md) for step-by-step instructions.

**Ready to migrate?** Run `pnpm exec tsx tmp/generateSampleXML.ts` to test with sample data first!
