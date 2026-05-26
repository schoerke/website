# Discography Scraper Design

**Date:** 2026-04-27  
**Status:** Approved

## Overview

A one-shot `tmp/` script that scrapes discography HTML for all 24 artists from the live WordPress site (both DE and EN), saves the raw HTML files locally, and prints a comparison summary. No browser automation required — content is in static HTML behind a redirect.

## Script

### `tmp/scrape-discographies.ts`

**Usage:**

```bash
pnpm tsx tmp/scrape-discographies.ts
```

**Steps:**

1. Read the 24 artist slugs from `scripts/wordpress/data/all-de.xml`
2. For each artist, fetch:
   - DE: `https://ks-schoerke.de/kuenstler/<slug>/` (follows 301 redirect)
   - EN: `https://en.ks-schoerke.de/artist/<slug>/`
3. Extract the innerHTML of `<div id="artist-diskography">` from each response
4. Save to `tmp/discography-html/<slug>-de.html` and `<slug>-en.html`
   - If no diskography content found, save an empty file
5. Print a per-artist comparison summary:
   - `BOTH` — has content in DE and EN, content differs
   - `IDENTICAL` — DE and EN content is the same (no translation)
   - `DE ONLY` — DE has content, EN empty/missing
   - `EMPTY` — no discography on either locale

**Output directory:** `tmp/discography-html/` (gitignored via `tmp/`)

## Integration with Import Script

After scraping, `scripts/importArtistRecordings.ts` is updated to read from:

- `tmp/discography-html/<slug>-de.html` (instead of `/tmp/<slug>-discography-raw.html`)
- `tmp/discography-html/<slug>-en.html` for EN locale (instead of copying DE)

This allows the import script to use real EN content where available rather than always copying DE.

## Out of Scope

- Rate limiting / politeness delays (site is small, 24 requests is fine)
- Retry logic (manual re-run is sufficient)
- Parsing or validation of content (that's the import script's job)
