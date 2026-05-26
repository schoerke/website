# Recordings Import Script Design

**Date:** 2026-04-27  
**Status:** Approved

## Overview

Two scripts to handle migrating recordings from the live WordPress site into the Payload Recordings collection, per-artist.

## Scripts

### 1. `tmp/delete-dummy-recordings.ts`

One-shot script to delete the 10 existing dummy recordings (IDs 1–10) from the remote database. Prints what will be deleted, asks for confirmation before proceeding.

### 2. `scripts/importArtistRecordings.ts`

Generic per-artist recordings import script.

**Usage:**

```bash
pnpm tsx scripts/importArtistRecordings.ts <artist-slug>
```

**Workflow:**

1. Look up artist by slug in Payload — exit with error if not found
2. Read `/tmp/<artist-slug>-discography-raw.html` — exit with error if file not found
3. Parse recording blocks from the HTML (same logic as `tmp/import-scheps-recordings.ts`):
   - `<strong>` = title
   - `<em>` = label/catalog (+ optional year in parentheses)
   - `Partner:` lines = partner info → stored in description
4. Auto-guess role from partner text; prompt interactively when ambiguous
5. Print a preview of all parsed recordings
6. Check if recordings already exist for this artist — if so, warn and ask whether to proceed
7. Ask for final confirmation before writing to database
8. Create draft recordings in Payload (DE locale), copy title+description to EN locale

**HTML source:** User opens `https://ks-schoerke.de/kuenstler/<slug>/`, clicks the Diskographie tab, copies the rendered HTML of that section, saves to `/tmp/<artist-slug>-discography-raw.html`.

## Data Model

Each recording created with:

- `title` — from `<strong>` text
- `recordingLabel` — from `<em>` text (label portion)
- `catalogNumber` — from `<em>` text (catalog portion)
- `recordingYear` — from year in parentheses
- `description` — richText from partner/extra lines
- `artists` — `[artist.id]`
- `roles` — `[role]` (guessed or interactively selected)
- `_status: 'draft'`

## Out of Scope

- Cover art (added manually in Payload admin after import)
- EN translations (DE content copied to EN as placeholder)
- Spotify/Apple Music URLs (added manually)
