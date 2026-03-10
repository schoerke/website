# Homepage Design

**Date:** 2026-03-10  
**Status:** Approved

## Overview

Design for the landing page at `/[locale]/` — currently an empty shell. The primary audience is **orchestras and venues looking to book artists**. The page builds a top-to-bottom narrative: agency credibility → recent activity → full artist roster → human team → call to action.

## Goals

- Give bookers an immediate, complete picture of the agency and its roster
- Surface recent news and projects to demonstrate active engagement
- Make it easy to find and contact the right person

## Non-Goals

- No hero/banner (bookers arrive purposefully — no cold-discovery marketing needed)
- No instrument filter tabs on the homepage artist grid (YAGNI — roster is small, all artists shown)
- No pagination on news (editorial control via CMS `home` category tag is sufficient)

## Section Structure (top to bottom)

### 1. News (`home`-tagged posts)

- Fetch with `getPaginatedPosts({ category: 'home', locale, publishedOnly: true })`
- Render with existing `NewsFeed.Server` component
- No pagination props — volume controlled by CMS tagging
- The `home` category already exists in `src/data/options.ts`

### 2. Artist Roster

- Fetch with existing `getArtistListData(locale)`
- Render with existing `ArtistGrid` component
- Pass `instruments={[]}` to suppress filter tabs — full sorted roster shown by default
- Sort order: by instrument priority, then alphabetically by last name (existing `ArtistGrid` behaviour)

### 3. Meet the Team (teaser)

- No data fetch needed
- Translated heading + short tagline + `<Link>` button to `/team`
- Uses `custom.pages.home` i18n namespace (new keys: `teamHeading`, `teamTagline`, `teamCta`)

### 4. Contact CTA

- No data fetch needed
- Translated heading + short tagline + `<Link>` button to `/kontakt` (de) / `/contact` (en)
- Uses `custom.pages.home` i18n namespace (new keys: `contactHeading`, `contactTagline`, `contactCta`)

## Data Fetching

Both data-fetching calls run in **parallel** via `Promise.all` to keep load time tight:

```ts
const [newsResult, artistsResult] = await Promise.all([
  getPaginatedPosts({ category: 'home', locale, publishedOnly: true }),
  getArtistListData(locale),
])
```

## i18n Keys Required

New keys to add to `custom.pages.home` in both `src/i18n/de.ts` and `src/i18n/en.ts`:

| Key              | DE                            | EN                          |
|------------------|-------------------------------|-----------------------------|
| `newsHeading`    | `"Aktuelles"`                 | `"Latest News"`             |
| `artistsHeading` | `"Unsere Künstler:innen"`     | `"Our Artists"`             |
| `teamHeading`    | `"Unser Team"`                | `"Meet the Team"`           |
| `teamTagline`    | `"Lernen Sie unser Team kennen"` | `"Get to know our team"` |
| `teamCta`        | `"Zum Team"`                  | `"Meet the Team"`           |
| `contactHeading` | `"Kontakt"`                   | `"Get in Touch"`            |
| `contactTagline` | `"Wir freuen uns von Ihnen zu hören"` | `"We'd love to hear from you"` |
| `contactCta`     | `"Kontakt aufnehmen"`         | `"Contact Us"`              |

## Component Map

| Section       | Component            | Source file                              | New code? |
|---------------|----------------------|------------------------------------------|-----------|
| News          | `NewsFeed.Server`    | `src/components/NewsFeed/`               | No        |
| Artist roster | `ArtistGrid`         | `src/components/Artist/ArtistGrid.tsx`   | No        |
| Team teaser   | inline in page       | `src/app/(frontend)/[locale]/page.tsx`   | Yes (small) |
| Contact CTA   | inline in page       | `src/app/(frontend)/[locale]/page.tsx`   | Yes (small) |

## File Changes

- `src/app/(frontend)/[locale]/page.tsx` — implement the homepage (currently empty shell)
- `src/i18n/de.ts` — add new `custom.pages.home` keys
- `src/i18n/en.ts` — add new `custom.pages.home` keys

## Success Criteria

- Booker can see recent agency news immediately on landing
- Full artist roster is visible without clicking through
- Clear paths to `/team` and `/contact` are present
- Page renders correctly in both `de` and `en` locales
- No client-side JavaScript required (pure server component)
