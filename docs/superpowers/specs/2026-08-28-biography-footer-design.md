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
  approval before executing). Also regenerate types (`generate:types`) and the drizzle schema
  (`generate:db-schema`). Prod-targeting scripts must run with `NODE_ENV=production` (avoids the
  `dev|-1` migration marker).
- **Retrofit of existing bios** (strip embedded blurbs, parse quote sources) is a **separate,
  gated data migration** — not part of this feature's code. See "Retrofit".

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
derived season daily. Without it, the displayed season stays frozen until an artist edit or deploy.

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

Below `PayloadRichText` in `src/components/Artist/ArtistTabContent.tsx` `BiographyTab`, two bold
lines, small font:

- L1: `[season, foto, quoteSource].filter(Boolean).join(' • ')` (same bullet separator as RecordingListItem)
- L2: consent

Rendered uniformly on every biography (footer appears even when quoteSource/credit empty →
season + consent). Footer hidden entirely if biography absent.

## Data Flow

```
artist page (server) — computes season, fetches artist via getArtistBySlug (image.credit populated)
  → ArtistTabs (client) → BiographyTab (client)
      → footer: season (prop) + foto (image.credit) + quoteSource (artist) + consent (t)
```

`getArtistBySlug` has an explicit `select` whitelist, so add `quoteSource: true` there. Regenerate
`src/payload-types.ts` after the schema change and update `src/services/artist.spec.ts`, whose
`ARTIST_SELECT` assertion expects the complete select object.

## Localization

- `quoteSource` field localized (editors provide per-locale wording, e.g. date phrasing).
- Consent + footer labels via next-intl `custom` translations (de/en).
- `quote` blockquote unchanged.
- Global localization fallback is off, but `getArtistBySlug` passes `fallbackLocale: 'de'`; an empty
  English quoteSource can therefore display the German value. The retrofit fills both locales.

## Testing

- `src/utils/season.spec.ts`: helper accepts an injected `Date` for deterministic tests; Aug 31 →
  "2025/2026", Sep 1 → "2026/2027", Dec → same as Sep, Jan → previous season.
- `BiographyTab` footer spec:
  - localized `Saison`/`Season` and `Foto:`/`Photo:` labels
  - season + foto + quoteSource joined with " • " (in order)
  - season-only details line has no stray separator
  - foto omitted when `image.credit` empty
  - quoteSource omitted when empty
  - consent line renders (both locales)
  - no footer when biography absent
- Existing `ArtistTabContent.spec.tsx` / `ArtistTabs.spec.tsx` updated for new props.

## Verification

- `pnpm test`, `pnpm lint`, `pnpm build`
- Manual admin check: set quoteSource, save, verify footer on live artist page (de + en), season
  boundary around Sept 1.

## Retrofit (gated, separate step)

Existing bios still contain the embedded blurb paragraph → after this feature ships, blurbs would
render twice until cleaned. Retrofit (requires explicit user approval before execution):

1. Backup before running (per db-operations checklists). Use Payload Local API, never raw SQL, and
   pass `context: { skipRevalidation: true }` because revalidation hooks run outside a Next request.
2. For each locale, strip the final paragraph only when it matches a blurb signature: a season label
   plus either a quote label or consent text. Otherwise skip it and report for manual review. Mario
   Venzago's de bio has no blurb.
3. Parse by locale-independent label regex `/(?:Anfangszitat|Quote|Quotation):/`; trim leading quote
   characters and whitespace, collapse doubled labels, and preserve an empty source as empty. The
   label/format variants above make fixed locale-specific string splitting unsafe.
4. Update each artist through the Local API with the cleaned localized biography and localized
   quoteSource. Derived season normalizes legacy `2025/26` values and makes older values such as
   Franck Juery's `2024/2025` show the current season.

## Out of Scope

- BiographyFooter as a lexical block (rejected: structured metadata is a poor fit for rich text;
  PDF generation prefers fields).
- Editable `details` freeform field (rejected: all three variable parts now derived/structured).
- Editable consent field (rejected: constant across all bios).
- Storing season (rejected: auto-derivation removes the manual entry pain).
- PDF generation (future feature; structured fields make it easier, not harder).
