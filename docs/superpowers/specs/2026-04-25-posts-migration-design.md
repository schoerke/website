# Posts Migration Design

**Date:** 2026-04-25
**Status:** Approved

## Overview

Migrate News and Projects posts from the WordPress data export into the Payload CMS backend. The approach
prioritizes data quality over speed: a finalized, human-reviewable JSON dataset is built first, then imported
to Payload in a single clean pass. Every post in Payload must have both a German and English locale — no
half-localized records.

## Scope

- **Source:** `scripts/wordpress/data/all-de.xml` (primary) + `scripts/wordpress/data/all-en.xml`
- **Date range:** Last 365 days (cutoff: ~2025-04-17, relative to most recent post 2026-04-17)
- **Categories:** News (DE primary) + Projects (EN only — no DE equivalent category in WordPress)
- **Volume:** ~89 DE News posts + ~79 EN Projects posts = ~168 posts total
- **Excluded:** Calendar, Video, Diskography, Repertoire, and all posts older than 365 days

## Constraints

- Every post created in Payload MUST have content in both `de` and `en` locales
- German content is the authoritative source for News posts
- Posts with missing locale content are flagged for auto-translation (not imported by default)
- No database operations without explicit user confirmation (per AGENTS.md policy)

## Architecture: Three Phases

### Phase 1 — Build Dataset (`buildPostsDataset.ts`)

Produces `scripts/wordpress/data/posts-dataset.json`. No database writes. Human-reviewable before import.

**Input:** `all-de.xml`, `all-en.xml`, `images-id-map.json`

**Algorithm:**

1. Parse all DE posts from the last 365 days with category `News`
2. Parse all EN posts from the last 365 days with categories `News` or `Projects`
3. For each DE News post, find its EN counterpart via two-pass matching:
   - **Pass 1 (exact):** Match by `wp:post_name` (slug) — covers ~23 posts
   - **Pass 2 (fuzzy):** Same artist category tag + published within 3 days — covers ~54 more posts
   - **Unmatched:** `en.source = "auto-translate"`, EN content left empty
4. For each EN Projects post, check if a DE match exists via same two-pass logic:
   - **Matched:** Include DE content
   - **Unmatched:** `de.source = "auto-translate"`, DE content left empty
5. Resolve artist slugs from category tags using a known artist name → slug map
6. Resolve featured image filename from WP attachment records (via `_thumbnail_id` meta)
7. Write `posts-dataset.json`

**Output format per entry:**

```json
{
  "wpSlug": "christian-zacharias-zuruck-in-granada",
  "publishedAt": "2026-03-15T10:00:00.000Z",
  "category": "news",
  "artists": ["christian-zacharias"],
  "imagePath": "christian-zacharias-headshot.jpg",
  "en": {
    "title": "Christian Zacharias back in Granada",
    "contentHtml": "<p>...</p>",
    "slug": "christian-zacharias-back-in-granada",
    "source": "matched"
  },
  "de": {
    "title": "Christian Zacharias zurück in Granada",
    "contentHtml": "<p>...</p>",
    "slug": "christian-zacharias-zuruck-in-granada",
    "source": "original"
  }
}
```

**Source values:**
- `"original"` — taken directly from the respective language's WordPress export
- `"matched"` — found via slug or date+artist matching
- `"auto-translate"` — no counterpart found; content needs translation before import

### Phase 2 — Upload Post Images

Extend the existing `uploadLocalMedia.ts` utility (or run as a separate pass) to upload the ~105 new post
featured images to Vercel Blob. This updates `images-id-map.json` with the new Payload image IDs.

Deduplication is handled by filename (existing behavior in `uploadLocalMedia.ts`). The 9 images already in the
map are skipped automatically.

Images are sourced from `scripts/wordpress/data/downloaded-media/` (96 already downloaded) and any remaining
files fetched from the attachment URLs in the XML.

### Phase 3 — Import Dataset (`importPostsDataset.ts`)

Reads `posts-dataset.json` and creates posts in Payload via the Local API.

**Behavior:**

- By default, **skips** any entry where either locale has `source: "auto-translate"`
- With `--include-auto-translate` flag, imports those entries with the available locale only (still requires
  both locales to be set — auto-translate entries will have the other locale set to the same content as a
  temporary fallback, clearly logged as needing review)
- Dry-run mode (`--dry-run`) logs what would be created without writing
- Deduplicates by slug — updates existing posts rather than creating duplicates
- Converts `contentHtml` → Lexical richText via `htmlToLexical`
- Resolves artist IDs by slug via `payload.find({ collection: 'artists', where: { slug: { equals: ... } } })`
- Resolves image ID from `images-id-map.json` by `imagePath` filename

**Import sequence per post:**

1. Create post with EN locale (title, slug, content, categories, artists, image, publishedAt, status: published)
2. `payload.update` with `locale: 'de'` to patch DE title, slug, content

## File Layout

```
scripts/wordpress/
  buildPostsDataset.ts       # Phase 1: produces posts-dataset.json
  importPostsDataset.ts      # Phase 3: imports posts-dataset.json into Payload
  data/
    posts-dataset.json       # Generated; human-reviewable before import
    images-id-map.json       # Updated by Phase 2 with post image IDs
```

## Artist Name → Slug Mapping

WordPress uses display names as category tags (e.g. "Christian Zacharias"). The migration maps these to Payload
artist slugs. Known mappings to cover (based on categories found in the data):

| WordPress Category        | Payload Slug              |
| ------------------------- | ------------------------- |
| Andreas Staier            | andreas-staier            |
| Christian Zacharias       | christian-zacharias       |
| Christian Poltéra         | christian-poltera         |
| Claire Huangci            | claire-huangci            |
| Conrad van Alphen         | conrad-van-alphen         |
| Cuarteto SolTango         | cuarteto-soltango         |
| Dominik Wagner            | dominik-wagner            |
| Gustav Rivinius           | gustav-rivinius           |
| Jean-Paul Gasparian       | jean-paul-gasparian       |
| Jonian Ilias Kadesha      | jonian-ilias-kadesha      |
| Marc Gruber               | marc-gruber               |
| Marie-Luise Neunecker     | marie-luise-neunecker     |
| Mario Venzago             | mario-venzago             |
| Martin Stadtfeld          | martin-stadtfeld          |
| Maurice Steger            | maurice-steger            |
| Monet Quintett            | monet-quintett            |
| Olga Scheps               | olga-scheps               |
| Thomas Zehetmair          | thomas-zehetmair          |
| Tianwa Yang               | tianwa-yang               |
| Till Fellner              | till-fellner              |
| Trio Gaspard              | trio-gaspard              |
| Trio Jean Paul            | trio-jean-paul            |
| Tzimon Barto              | tzimon-barto              |
| Zehetmair Quartett        | zehetmair-quartett        |

Unrecognized category tags are logged as warnings and ignored (not treated as artist links).

## Expected Dataset Composition

| Type                         | Count | Both locales? |
| ---------------------------- | ----- | ------------- |
| DE News matched to EN        | ~77   | ✅ Yes        |
| DE News unmatched (EN needed)| ~12   | ⚠️ auto-translate |
| EN Projects matched to DE    | ~72   | ✅ Yes        |
| EN Projects unmatched (DE needed) | ~7 | ⚠️ auto-translate |

## What Is Not In Scope

- Calendar, Video, Diskography, Repertoire posts
- Posts older than 365 days
- Recordings migration (separate effort, noted in migration-status.md)
- Auto-translation implementation (content must be provided before `--include-auto-translate` is used)

## Related Documents

- `docs/migration-status.md` — overall migration status
- `scripts/wordpress/migrateArtists.ts` — reference implementation pattern
- `scripts/wordpress/utils/uploadLocalMedia.ts` — image upload utility
- `scripts/wordpress/utils/lexicalConverter.ts` — HTML → Lexical richText
