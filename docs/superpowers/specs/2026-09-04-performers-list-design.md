# PerformersList Design

## Summary

A new richText block, `PerformersList`, lets editors embed a list of performers (soloists, ensemble
groups with their members) inside Posts and Repertoire content — the same way `EventDates` embeds
concert dates and the (not-yet-implemented) `WorksList` embeds concert programs. It covers the
"Mitwirkende" use case seen in post 116 ("Tianwa Yang | Violine" / "Trio Catch" / "Martin Adámek |
Klarinette" ...), but as **structured fields with block-controlled layout** rather than free-text
`Name | Instrument` pipe lines. Two item kinds: a flat `performer` (name + optional instrument) and an
`ensembleGroup` (group name + nested member performers).

## 1. `PerformersList` block

New file: `src/blocks/PerformersList.ts`. Registered in the `BlocksFeature` blocks array of:

- `src/collections/Posts.ts` (alongside `VideoEmbed, AudioEmbed, EventDates`)
- `src/collections/Repertoire.ts` (alongside `VideoEmbed, AudioEmbed`)

Update Repertoire's content-field admin description too: it currently says content supports text,
video, and audio only. Replace it with:

```ts
description: {
  en: 'List of works in this repertoire section (text, video/audio embeds, performer lists; links are not supported)',
  de: 'Liste der Werke in diesem Repertoire-Abschnitt (Text, Video-/Audio-Einbettungen, Mitwirkendenlisten; Links werden nicht unterstützt)',
}
```

Not added to Pages (no custom richText editor/BlocksFeature config exists there yet — out of scope,
separate future work) or Recordings (its richText field explicitly documents "no embedded media
allowed" — out of scope).

### Structure

```
PerformersList (slug: performersList)
├─ labels: PerformersList / PerformersList (singular), PerformersLists / PerformersLists (plural)
├─ admin.disableBlockName: true              — matches existing blocks; avoids the known upstream
│                                              focus-stealing bug. Block name is unused.
├─ title: text, optional                    — optional heading above the list, e.g. "Mitwirkende"
│                                            (or a concert's "Besetzung"). Not marked localized:
│                                            the parent richText field is already localized, so the
│                                            whole block tree — including this field — is stored
│                                            per-locale for free; a nested localized:true flag
│                                            here would be dead config.
└─ items: blocks field, required, minRows: 1
     ├─ performer (slug: performer)
     │    ├─ name: text, required, trim-aware validate
     │    └─ instrument: text, optional    — free text (Violine, Klavier, ...). Optional so a
     │                                       conductor or unnamed role ("Dirigentin") or a
     │                                       performer with no instrument renders name-only.
     └─ ensembleGroup (slug: ensembleGroup)
          ├─ groupName: text, required, trim-aware validate
          │                                 — e.g. "Trio Catch", "Ensemble Resonanz"
          └─ members: array, required, minRows: 1
               └─ member
                    ├─ name: text, required, trim-aware validate
                    └─ instrument: text, optional — same shape as a top-level performer row
```

Use bilingual labels throughout the admin UI:

- `title`: Title / Titel
- `items`: Item / Items; Element / Elemente
- `performer`: Performer / Mitwirkende:r; Performers / Mitwirkende
- `name`: Name / Name
- `instrument`: Instrument / Instrument
- `ensembleGroup`: Ensemble Group / Ensemble; Ensemble Groups / Ensembles
- `groupName`: Ensemble Name / Ensemble-Name
- `members`: Member / Members; Mitglied / Mitglieder

Notes:

- A nested `blocks` field (not a plain `array`) is used for `items` so editors can freely reorder and
  interleave `performer` and `ensembleGroup` rows in one sequence — same rationale as `WorksList`'s
  `items`.
- `members` is a plain `array` field (not a nested `blocks` field) re-declaring the two-field
  performer shape. This duplicates the `name`/`instrument` fields, but mirrors `WorksList`'s
  `composerGroup.works` array pattern and avoids nested-blocks admin complexity. A top-level
  `performer` row and a `members` row are the same shape.
- `required: true` + `minRows: 1` uses Payload's default `blocks` / `array` validation on both
  `items` and `members`, including API/server validation. Do **not** add custom row-count validation:
  a field-level `validate` replaces Payload's default validation unless it explicitly composes the
  default validator.
- Required text fields need a small trim-aware validator so whitespace-only `name` / `groupName` values
  fail. It must compose Payload's default `text()` validator first, preserving `required` and all default
  constraints:

  ```ts
  const result = text(value, args)
  if (result !== true) return result
  return typeof value === 'string' && value.trim() ? true : 'Value is required'
  ```

  Optional `title` and `instrument` are trimmed before conditional rendering, so blank values do not
  leave an empty heading accent or instrument span.

- No `defaultValue` seeding on insert, for either `items` or `members`. `EventDates`' `defaultValue:
[{}]` trick doesn't transfer: `items` is a discriminated `blocks` field, so a bare `{}` row has no
  `blockType`; and a seeded `performer`/`ensembleGroup` row would fail validation immediately because
  `name`/`groupName` are required and unset. Editors add at least one row manually and see the minRows
  validation error until they do. (Decision carried over from `WorksList`.)
- Export a `PerformersListBlockFields` discriminated union (mirrors `EventDatesBlockFields`) since block
  field shapes inside richText JSON aren't part of generated `payload-types`. It must match Payload's
  flat BlocksField serialization, not a nested prototype-only shape:

  ```ts
  interface PerformerItem {
    id?: string
    blockType: 'performer'
    name: string
    instrument?: string | null
  }

  interface EnsembleGroupItem {
    id?: string
    blockType: 'ensembleGroup'
    groupName: string
    members?: { id?: string; name: string; instrument?: string | null }[] | null
  }

  export interface PerformersListBlockFields {
    title?: string | null
    items?: (PerformerItem | EnsembleGroupItem)[] | null
  }
  ```

## 2. Frontend rendering

New component: `src/components/blocks/PerformersList.tsx`, following the existing
`EventDates`/`AudioEmbed` component pattern. Uses Tailwind utility classes directly (matching
`VideoEmbed.tsx`'s convention, rather than a separate stylesheet).

Visual direction was validated in a temporary prototype route before the production component was
implemented. The prototype is not part of this feature. Component tests cover the final rendering
contract, including long-content wrapping.

Wired into `src/components/ui/PayloadRichText.tsx`'s `blocks` converter map, same pattern as
`eventDates`:

```tsx
performersList: ({ node }: { node: SerializedLexicalNode & { fields: PerformersListBlockFields } }) => {
  return <PerformersList {...node.fields} />
},
```

### Layout

- **Optional title**: rendered as a flex row — a short brand-yellow rule followed by the heading text,
  the same accent `SectionHeading.tsx` uses, scaled for prose context:

  ```
  <div className="mb-2 flex items-center gap-3">
    <span aria-hidden="true" className="bg-primary-yellow h-0.5 w-6 shrink-0" />
    <h3 className="text-primary-black text-base font-semibold">{title}</h3>
  </div>
  ```

  - `bg-primary-yellow` is the brand color (`--color-primary-yellow: #fcc302`).
  - The rule is `h-0.5 w-6` (smaller than `SectionHeading`'s `w-10`) so it reads as an inline body
    accent, not a page-section header.
  - Use `h3`: post title owns `h1`, and the title labels block-level subcontent. It must not compete
    with editor-authored post `h2` sections.

- **Performer row**: one flex row per performer — name semibold, instrument in light gray, inline:

  ```
  <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0">
    <span className="break-words font-semibold">{name}</span>
    {instrument ? <span className="break-words text-gray-500">{instrument}</span> : null}
  </div>
  ```

  - No pipe separator, no free-text "Name | Instrument" input — the block controls layout.
  - Instrument optional: a row with no instrument renders just the semibold name.
  - Contrast: `text-gray-500` (#6b7280) on white ≈ 4.84:1, passes WCAG AA for normal text
    (4.5:1) at `text-sm`. Consistent with `WorksList`'s existing `text-gray-500` year styling.

- **EnsembleGroup**: group name rendered bold, member rows nested below, indented one level:

  ```
  <div className="flex flex-col gap-1">
    <div className="font-semibold">{group.groupName}</div>
    <div className="flex flex-col gap-1 pl-4">
      {/* member rows, same markup as a top-level performer row */}
    </div>
  </div>
  ```

- **List semantics, no decoration**: render top-level items and group members as nested `<ul>` / `<li>`
  structures for screen-reader hierarchy, but give both lists `list-none m-0 p-0`. The top-level list
  gets `flex flex-col gap-1.5`; member lists get `flex flex-col gap-1 pl-4`. No bullets, dashes,
  numbering, or other visible list decoration. Spacing comes only from the specified `gap` utilities.

- **Mobile**: no breakpoint-specific styles needed. `flex-wrap`, `min-w-0`, and `break-words` keep
  long names/instruments from overflowing narrow screens; an instrument wraps naturally below its
  name. Member indent `pl-4` holds on small screens. Unlike `WorksList` (which gates its name column
  behind `md:`), there is no fixed-width column here, so nothing needs a breakpoint switch.

### Spacing rhythm

- Within a group (between a group's members): tight spacing, `gap-1` (0.25rem).
- Between different top-level items (a new `performer` or `ensembleGroup` starting): slightly larger,
  `gap-1.5` (0.375rem) — applied via the outer container's `gap-1.5` on a `flex flex-col`, not manual
  margin classes.
- Body text size: `text-sm leading-snug` (smaller than default body copy, tighter line height) —
  matches `WorksList`'s dense-reference-content convention.

### Rendering rules

- If `title` is set, render it as the yellow-rule heading above the list; if unset, render no heading.
- Each `performer` item renders as a performer row.
- Each `ensembleGroup` item renders the group name bold, then its member rows indented below.
- List order is whatever order `items` are in — no re-sorting, alphabetizing, or deduping by the
  renderer. Editors control `items` order manually.
- RichText block JSON is not schema-migrated. Runtime-guard every value before access: `title` becomes
  `typeof title === 'string' ? title.trim() : ''`; reject nulls, primitives, and objects without a valid
  `blockType` from `items`; then return `null` if no valid items remain. A valid performer has a non-empty
  trimmed string `name`; a valid group has a non-empty trimmed string `groupName`. For a group, filter
  `members` with the same string checks only if `Array.isArray(item.members)`; no valid members means the
  group renders no nested list. This prevents malformed saved data from throwing or creating blank UI.
- Use Payload row `id` values as React keys for items and members. Defensive fallback keys may exist only
  for missing IDs: `item.id ?? \`item-${index}\`` and `member.id ?? \`member-${memberIndex}\``. Do not use
  indexes for normal saved rows.

## 3. Search / normalizedContent

`extractLexicalText` (`src/utils/search/extractLexicalText.ts`) walks only node `children`, not block
`fields` — so text inside any block (including this one) is not indexed in `normalizedContent` or the
search index. This is an existing limitation shared by `EventDates`/`VideoEmbed`/`AudioEmbed` blocks
and is **out of scope** here. If block-content search becomes a requirement later, it's a separate
change to the text-extraction/search pipeline affecting all blocks.

## 4. Testing

- Block config tests: `required` / `minRows` on `items` and `members`; trim-aware validation rejects
  whitespace-only names and group names while composing Payload's default `text()` validator.
- Component tests: title/no-title; flat performer; performer without instrument; ensemble group with
  nested members; empty/missing/malformed `items` and `members`; brand-yellow rule; semantic nested
  lists with no visible list decoration; long name/instrument mobile-wrap class contract; and rendered
  order for ID-bearing fixtures. React keys are not exposed in DOM, so do not claim direct key tests;
  test no duplicate-key warning for a fixture containing unique Payload row IDs instead.
- `PayloadRichText` converter test: a real lexical block node with flat `blockType` fields invokes
  `PerformersList` with the expected field shape.
- Component tests use `PerformersListBlockFields`' flat `blockType` rows, semantic `<ul>/<li>`, `h3`,
  and final wrap classes, including long unbroken name/instrument content.

## 5. Verification

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Deferred: Firefox block-editor focus

Firefox can move focus from a regular field inside a newly inserted Lexical block back into the parent
rich-text editor, causing typed text to land below the block. This is an upstream Payload Lexical bug,
not a `PerformersList` schema or renderer issue: https://github.com/payloadcms/payload/issues/17468.

Safari testing passed. Firefox support is deferred for now to keep the standard inline block-editing
workflow consistent with existing blocks. If Firefox support becomes required, use Payload's supported
`admin.components.Block` API to render a compact inline block and edit `title`/`items` in the block's
drawer. This changes only the `PerformersList` admin workflow; persisted data and frontend rendering
remain unchanged.

## Explicitly out of scope

- Pages support (no custom richText editor config exists there yet)
- Recordings support (richText field there explicitly says "no embedded media allowed")
- Converting existing posts (e.g. post 116's free-text performer lines) to `PerformersList` blocks —
  editors convert manually when editing posts
- Search indexing of block `fields` (see section 3 — shared limitation, separate change)
- `sortName`/alphabetical ordering or group deduping — editors control `items` order manually
- Instrument typeahead or a controlled instrument vocabulary — instruments stay free text
