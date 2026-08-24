# Concert Dates Block Design

Date: 2026-08-24
Status: Approved (pending review)

## Summary

A reusable Payload lexical block for structured concert-date lists inside news posts. Replaces the current practice of hand-typing linked date lines (see Post 240: "17. Juli 2026, Toblach" as plain rich-text links).

## Scope

- Posts collection rich text editor only. (Note: existing blocks are registered in Posts *and* Repertoire — Posts-only here is an explicit scope choice; see Registration.)
- No database migration: block data lives inline in the lexical JSON of the existing `content` field.
- No DB credentials, no schema push, no `.env` changes.

## Architecture

Follows the existing block pattern exactly:

1. Block config in `src/blocks/ConcertDates.ts`
2. Registered in `BlocksFeature` in `src/collections/Posts.ts`
3. Render component in `src/components/blocks/ConcertDates.tsx`
4. Converter entry in `src/components/ui/PayloadRichText.tsx` `blocks` map

## Block Definition

`src/blocks/ConcertDates.ts`

- `slug: 'concertDates'`
- `admin.disableBlockName: true` — consistent with existing blocks (upstream focus-stealing bug in the lexical block-name input)
- Labels:
  - singular: de `Konzerttermin`, en `Concert date`
  - plural: de `Konzerttermine`, en `Concert dates`
- Single field `dates` (array, `minRows: 1`), each row:
  - `date` — `type: 'date'`, required; label de `Datum` / en `Date`
  - `venue` — `type: 'text'`, localized, required; label de `Veranstaltungsort` / en `Venue`
  - `url` — `type: 'text'`, optional; label de `Link zur Veranstaltung` / en `Event link`; validated with existing `validateURL` from `src/validators/fields.ts`
- Export `ConcertDatesBlockFields` interface (same convention as `VideoEmbedBlockFields` / `AudioEmbedBlockFields`):

```ts
export interface ConcertDatesBlockFields {
  dates: { id?: string; date: string; venue: string; url?: string }[]
}
```

(`id` is the Payload array-row id, used as React key. Block fields live inside richText JSON and are **not** part of generated payload-types — the hand-written interface above is the sole typing source for the converter.)

- Date field admin config: `pickerAppearance: 'dayOnly'` so the picker stores date-only midnight UTC values.
- URL validation: `validate: validateURL()` — note `validateURL` is a curried factory and must be invoked.
- No style/select field — fixed styling only.

## Registration

Add `ConcertDates` to the blocks array in `BlocksFeature` in `src/collections/Posts.ts`.

Note: existing blocks (VideoEmbed/AudioEmbed) are registered in both Posts and Repertoire collections. Concert Dates is **Posts only** — an explicit scope choice, not a consequence of the existing pattern.

## Render Component

`src/components/blocks/ConcertDates.tsx`

- Props: `{ dates: ConcertDatesBlockFields['dates']; locale?: 'de' | 'en' }` — `locale` defaults to `'de'`
- **Empty guard:** if `dates` is empty/undefined (freshly inserted block), return `null` — precedent: `src/components/blocks/AudioEmbed.tsx:14-16`
- Renders a `<ul>` with no list markers (no `list-disc`; plain rows)
- Each row renders very similarly to the current plain-text usage in Post 240, but smaller
- Date formatted per locale with **explicit UTC timezone** — `new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })`. Without `timeZone`, Payload's midnight-UTC date values shift a day back for western-hemisphere en viewers. (Existing `formatDate` in `src/utils/post.ts` has the same gap; do not reuse it here — inline UTC formatter keeps the fix isolated.)
- Date wrapped in semantic `<time>` element (precedent: `NewsFeedList.tsx`, `PostDetailContent.tsx`)
- Venue follows the date; when `url` present, the venue text is the external link (`target="_blank"`, `rel="noopener noreferrer"`)
- Render-side URL protocol defense-in-depth: cheap `new URL(url).protocol` http(s) check before rendering the link (precedent: `AudioEmbed.tsx:41-52`); render row without link if unsafe
- Row `<li>` keyed by `row.id`
- Smaller type size (e.g. `text-sm`) and adjustable line-height — exact values to be tuned when styling
- Fixed styling only, no per-block style control

## Converter

In `src/components/ui/PayloadRichText.tsx`, add to the `blocks` map. Cast `locale` to `'de' | 'en'` like the existing converters (`PayloadRichText.tsx:87`):

```
concertDates: ({ node }: { node: SerializedLexicalNode & { fields: ConcertDatesBlockFields } }) => {
  return <ConcertDates dates={node.fields.dates} locale={locale as 'de' | 'en'} />
}
```

## Types

No `payload generate:types` needed — block fields live inside richText JSON and never appear in `payload-types.ts` (verified: `videoEmbed`/`audioEmbed` produce no generated types). The hand-written `ConcertDatesBlockFields` interface is the sole typing source. No admin importmap change (no custom admin components).

## Testing

- Component spec `src/components/blocks/ConcertDates.spec.tsx` (pattern: `AudioEmbed.spec.tsx`):
  - renders nothing when `dates` is empty/undefined
  - renders date in de format ("17. Juli 2026")
  - renders date in en format ("July 17, 2026")
  - renders venue; wraps venue in link when `url` present
  - renders without link when `url` absent
  - omits link for unsafe URL (render-side guard)
  - renders multiple rows
- Manual: insert block in a post in admin, verify rendered list in both locales.

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Out of Scope

- Artist pages (posts only per decision)
- Style control fields (fixed styling)
- Time / note / price / sold-out fields
- Separate Concerts collection