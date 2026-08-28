# EventDates Block Design

Date: 2026-08-28
Status: Approved

Supersedes: `2026-08-24-concert-dates-block-design.md` (never implemented). Naming and fields
changed per editor preference (`EventDates` / `events` / `location`); render mirrors post 242.

## Summary

A reusable Payload lexical block for structured event-date lists inside news posts. Replaces the
current practice of hand-typing linked date lines (see Post 242: "4. Juli 2026, Yamagata" as
plain rich-text links, one per `<linebreak>`).

## Scope

- Posts collection rich text editor only (`Posts.content` `BlocksFeature`).
- No database migration: block data lives inline in the lexical JSON of the existing `content`
  field. Existing posts untouched (post 242 stays as-is).
- No DB credentials, no schema push, no `.env` changes.

## Architecture

Follows the existing block pattern exactly (VideoEmbed / AudioEmbed):

1. Block config in `src/blocks/EventDates.ts`
2. Registered in `BlocksFeature` in `src/collections/Posts.ts`
3. Render component in `src/components/blocks/EventDates.tsx`
4. Converter entry in `src/components/ui/PayloadRichText.tsx` `blocks` map

## Block Definition

`src/blocks/EventDates.ts`

- `slug: 'eventDates'`
- `admin.disableBlockName: true` — consistent with existing blocks (upstream focus-stealing bug in
  the lexical block-name input)
- Labels:
  - singular: de `Termin`, en `Event Dates`
  - plural: de `Termine`, en `Event Dates`
- Single field `events` (array, `minRows: 1`), each row:
  - `date` — `type: 'date'`, required; label de `Datum` / en `Date`; admin
    `date.pickerAppearance: 'dayOnly'` so the picker stores date-only midnight UTC values
  - `location` — `type: 'text'`, required; label de `Ort` / en `Location`
  - `url` — `type: 'text'`, optional; label de `URL`; validated with existing `validateURL()`
    factory from `src/validators/fields.ts` (note: curried — must be invoked)
- Server-side array `validate` (mirrors "maxRows is UI-only" pattern): reject non-array / empty
  events.
- Export `EventDatesBlockFields` interface (same convention as `VideoEmbedBlockFields` /
  `AudioEmbedBlockFields`):

```ts
export interface EventDatesBlockFields {
  events: { id?: string; date: string; location: string; url?: string }[]
}
```

(`id` is the Payload array-row id, used as React key. Block fields live inside richText JSON and
are **not** part of generated payload-types — the hand-written interface above is the sole typing
source for the converter.)

- Fields are **not localized** — BUT `Posts.content` is `localized: true` with `fallback: false`, so
  each locale holds an independent lexical document. The block must be re-created per locale (same as
  today's manual 242 practice); within one locale there is no per-row translation UI. If an editor
  forgets the block in `en`, events are silently absent there.

## Registration

Add `EventDates` to the blocks array in `BlocksFeature` in `src/collections/Posts.ts`. Posts only —
explicit scope choice, not a consequence of the existing pattern (VideoEmbed/AudioEmbed are also in
Repertoire).

## Render Component

`src/components/blocks/EventDates.tsx`

- Props: `{ events: EventDatesBlockFields['events']; locale?: 'de' | 'en' }` — `locale` defaults to
  `'de'`
- **Empty guard:** if `events` is empty/undefined (freshly inserted block), return `null` —
  precedent: `src/components/blocks/AudioEmbed.tsx:11-16`
- Renders a plain list mirroring post 242: one event per line, each line joined from
  `[formattedDate, location].filter(Boolean).join(', ')` (comma-safe when a part is empty),
  separated by `<br />` (exactly how 242 renders today).
- Date formatted per locale with **explicit UTC timezone** via top-level helper
  `formatEventDate(iso, locale)` — `new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long',
  year: 'numeric', timeZone: 'UTC' })`. Without `timeZone`, Payload's midnight-UTC date values shift a
  day back for western-hemisphere en viewers. Explicit UTC also avoids SSR/client hydration mismatch
  (server TZ on Vercel is UTC, client varies). Inline UTC formatter keeps the fix isolated (do not
  reuse `formatDate` in `src/utils/post.ts`, which has the same gap). Invalid date input → guard
  first: `if (!iso || typeof iso !== 'string') return ''` — never let `new Date(null)` produce
  1970-01-01 — then NaN-check, return empty string (row renders without date text).
- When `url` present, the whole "date, location" line is the external link
  (`target="_blank"`, `rel="noopener noreferrer"`); when absent, plain text line.
- Row keyed by `row.id ?? index` (freshly inserted rows in live preview have no id yet).
- Render-side URL protocol defense-in-depth: reuse `sanitizeUrl()` (`src/utils/html.ts`) — if it
  returns `'#'`, render the row as plain text instead of a link.

## Converter

In `src/components/ui/PayloadRichText.tsx`, add to the `blocks` map. Cast `locale` to
`'de' | 'en'` like the existing converters:

```tsx
eventDates: ({ node }: { node: SerializedLexicalNode & { fields: EventDatesBlockFields } }) => {
  return <EventDates events={node.fields.events} locale={locale as 'de' | 'en'} />
}
```

## Types

No `payload generate:types` needed — block fields live inside richText JSON and never appear in
`payload-types.ts` (verified: `videoEmbed`/`audioEmbed` produce no generated types). The hand-written
`EventDatesBlockFields` interface is the sole typing source. No admin importmap change (no custom
admin components).

## Testing

- Component spec `src/components/blocks/EventDates.spec.tsx` (pattern: `AudioEmbed.spec.tsx`):
  - renders nothing when `events` is empty/undefined
  - renders de format: "4. Juli 2026, Yamagata"
  - renders en format: "July 4, 2026, Yamagata"
  - wraps line in link when `url` present (target blank, rel noopener noreferrer)
  - renders plain text when `url` absent
  - omits link for unsafe URL (`javascript:` etc.) via `sanitizeUrl`
  - renders multiple events in order
  - `date: null` → no "1. Januar 1970" (formatEventDate guard)
  - empty `location` → no trailing comma
  - whitespace-padded url (`" https://x "`) → consistent link/fallback
  - row without `id` → key fallback works
  - near-midnight date (`2026-07-04T00:00:00.000Z`) → confirms explicit UTC prevents day shift
- `formatEventDate` unit tests: de/en formats, invalid date → empty string, `null`/`undefined` →
  empty string.

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Out of Scope

- Artist pages / Repertoire (posts only per decision)
- Style control fields (fixed styling, mirrors 242)
- Time / note / price / sold-out fields
- Separate Events/Concerts collection
- Converting post 242 to the block (left as-is per decision)