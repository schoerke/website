# BiographyFooter Design

Date: 2026-08-28
Status: Approved

## Summary

Replace the hand-typed bio footer blurb ("Saison 2025/2026 | Foto: Uwe Arens | Anfangszitat:
Online Merker, 02. Dezember 2024" + consent line, present in 23 de + 24 en artist bios; Mario
Venzago's de bio has no blurb) with a derived footer: season auto-computed, photo credit from the
featured image, quote source from one new field, consent hardcoded. Only one new data field is
added to Artists.

## Scope

- Artists collection: add localized `quoteSource` field (Biographie tab, next to `quote`).
- Artist detail page: render a derived 2-line BiographyFooter under the biography.
- **Schema change on `artists`** → Payload migration required (gated, needs explicit user
  approval before executing). Workflow: config → `pnpm payload migrate:create` → review generated
  `up()`/`down()` → add idempotency guards → preflight local production snapshot → regenerate types
  (`generate:types`) and drizzle schema (`generate:db-schema`) → deploy. The nullable localized
  text column needs an idempotent `artists_locales.quote_source` migration; generated files alone do
  not change the database. Prod-targeting scripts must run with `NODE_ENV=production` (avoids the
  `dev|-1` migration marker).
- **Legacy bio cleanup is manual before deployment.** Editors remove each hand-typed footer and
  enter quoteSource for each locale. No automated retrofit script or data migration.

## Current State (verified from data)

Blurb is the last paragraph of `biography` (de + en, hand-translated), two bold text nodes
joined by a `<linebreak>`:

- L1: `Saison 2025/2026 | Foto: Uwe Arens| Anfangszitat: Online Merker, 02. Dezember 2024`
- L2: `Änderungen und Kürzungen bedürfen der Absprache mit der Künstlersekretariat Astrid Schoerke GmbH`

Variants observed: season "2025/2026" vs "2025/26"; "Foto:" vs "Fotos:" vs "Foto ";
`Quote:` vs `Quotation:` vs doubled `Quote: Quote:`; empty quote source; a three-node paragraph;
leading stray quotation marks; mixed-language lines; missing spaces; trailing spaces; and seven
consent variants (including shortened company names). English equivalents are not consistently
translated.

## Design

### Schema (Artists collection)

One new field in the Biographie tab, directly below `quote`:

```
name: 'quoteSource'
type: 'text'
localized: true
required: false
label: { de: 'Zitatquelle', en: 'Quote source' }
```

Used **only** in the biography footer — the featured-quote blockquote keeps rendering `quote`
alone.

### Season derivation (render-time, server-computed)

No field. Concert season runs Sept → next Sept:

- Month Sep–Dec (index >= 8): `{year}/{year + 1}`
- Month Jan–Aug (index < 8): `{year - 1}/{year}`

Computed **on the artist page server component** (current date) and passed down as a prop, so the
client BiographyTab never calls `new Date()` — avoids SSR/client hydration mismatch. Label
localized: de `Saison 2025/2026`, en `Season 2025/2026`.

The artist page is statically generated, so add `export const revalidate = 86400` to refresh the
derived season within 24 hours. Without it, the displayed season stays frozen until an artist edit
or deploy.

Example: today (2026-08-28) → `2025/2026`, matching live blurbs.

### Photo credit (render-time, from image)

No field. Read from the artist's featured image `image.credit` (already depth-populated by
`getArtistBySlug`). Rendered as `Foto: {credit}` (de) / `Photo: {credit}` (en) only when credit is
non-empty. 24/24 artists have an image; 22 carry credit.

### Consent line (hardcoded)

No field. Rendered from translation strings:
- de: `Änderungen und Kürzungen bedürfen der Absprache mit der Künstlersekretariat Astrid Schoerke GmbH`
- en: `Amendments or edits need the consent of Künstlersekretariat Astrid Schoerke GmbH`

### Render (BiographyFooter)

Below `PayloadRichText` in `src/components/Artist/ArtistTabContent.tsx` `BiographyTab`, a semantic
`<footer>` with two `<p>` elements, both bold small text and explicit spacing:

- L1: `[season, foto, quoteSource].filter(Boolean).join(' • ')` (same bullet separator as RecordingListItem)
- L2: consent

Rendered uniformly on every biography (footer appears even when quoteSource/credit empty →
season + consent). Render neither rich text nor footer when biography has no visible Lexical text
(null, empty root, or no text nodes).

## Data Flow

```
artist page (server) — computes season, fetches artist via getArtistBySlug (image.credit populated)
  → ArtistTabs (client) → BiographyTab (client)
      → footer: season (prop) + foto (image.credit) + quoteSource (artist) + consent (t)
```

`getArtistBySlug` has an explicit `select` whitelist, so add `quoteSource: true` there. Regenerate
`src/payload-types.ts` after the schema change and update `src/services/artist.spec.ts`, whose
`ARTIST_SELECT` assertion expects the complete select object. The footer narrows image values
(`typeof image === 'object' && image !== null`), trims `image.credit`, and omits photo credit for
ID, null, undefined, empty, or whitespace-only values.

## Localization

- `quoteSource` field localized (editors provide per-locale wording, e.g. date phrasing).
- Consent + footer labels via next-intl `custom.pages.artist.biographyFooter` translations (de/en):
  `season`, `photo`, and `consent`.
- `quote` blockquote unchanged.
- Global localization fallback is off, but `getArtistBySlug` passes `fallbackLocale: 'de'`; an empty
  English quoteSource can therefore display the German value.

## Testing

- `src/utils/season.spec.ts`: `getConcertSeason(date: Date): string` accepts an injected Date for
  deterministic tests; Aug 31 → "2025/2026", Sep 1 → "2026/2027", Dec 31 → same as Sep, Jan 1 →
  previous season.
- `BiographyTab` footer spec:
  - localized `Saison`/`Season` and `Foto:`/`Photo:` labels
  - season + foto + quoteSource joined with " • " (in order)
  - season-only details line has no stray separator
  - foto omitted when image is ID/null/undefined or `image.credit` is empty/whitespace-only
  - quoteSource omitted when empty
  - consent line renders (both locales)
  - no footer when biography is null, has an empty root, or has no visible text node
- Existing `ArtistTabContent.spec.tsx` / `ArtistTabs.spec.tsx` updated for new props; assert
  season, quoteSource, and safely narrowed image credit flow through ArtistTabs to BiographyTab.
- Service coverage: EN quoteSource absent → DE fallback returned; EN quoteSource present → EN value
  retained. Update ARTIST_SELECT exact-match assertion.
- Migration coverage: up/down idempotency and generated schema has `artists_locales.quote_source`.
- Route coverage: `revalidate === 86400`.

## Verification

- `pnpm test`, `pnpm lint`, `pnpm build`
- Manual admin check: set quoteSource, save, verify footer on live artist page (de + en), season
  boundary around Sept 1.

## Manual Rollout (required before deployment)

Existing bios retain the hand-typed footer. Shipping the derived footer before cleanup duplicates
the details and consent lines. Before deployment, editors must update every affected locale:

1. Remove the final hand-typed two-line footer paragraph from the biography.
2. Enter the quote portion in localized `quoteSource` when available; leave it empty otherwise.
3. Save and verify the derived footer renders once with auto season, image credit (if set), and
   consent. Mario Venzago's de bio has no legacy footer to remove.

No automated parsing, Payload Local API bulk updates, or data migration is authorized for cleanup.

## Out of Scope

- BiographyFooter as a lexical block (rejected: structured metadata is a poor fit for rich text;
  PDF generation prefers fields).
- Editable `details` freeform field (rejected: all three variable parts now derived/structured).
- Editable consent field (rejected: constant across all bios).
- Storing season (rejected: auto-derivation removes the manual entry pain).
- PDF generation (future feature; structured fields make it easier, not harder).
