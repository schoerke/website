# WorksList Design

## Summary

A new richText block, `WorksList`, lets editors embed a list of musical works grouped by composer
(composer + one or more works, with optional pause/intermission markers) inside Posts and Repertoire
content — the same way `EventDates` embeds concert dates today. It covers two distinct use cases with
one block: a concert program (with pauses, an optional title, and possibly multiple composers) and a
plain repertoire listing (no pauses, just composers and their works). Composer names are backed by a
static, code-managed list so editors pick from existing names via a filtered select field, rather than
retyping free text.

Performers/soloists are explicitly **out of scope** — they're already handled elsewhere (Repertoire's
`artists` relationship) and are not part of this block.

## 1. Composer list (static, code-managed)

New file: `src/constants/composers.ts`.

```ts
export interface Composer {
  value: string // stable slug/id, e.g. 'beethoven'; naming convention below
  lastName: string // surname, e.g. 'Beethoven' — default display
  fullName?: string // e.g. 'Ludwig van Beethoven' — used when "show full names" is on
  sortName?: string // for alphabetizing, e.g. 'Beethoven, Ludwig van'
  birthYear?: number
  deathYear?: number
}

export const COMPOSERS: Composer[] = [
  // maintained by hand; add a new entry + deploy to make a composer available
]
```

**Slug convention for `value`**: kebab-case of `lastName` (e.g. `'beethoven'`, `'schumann'`). When two
composers share a surname (e.g. the Bach family), append initials to disambiguate: `'bach-js'` (J.S.
Bach), `'bach-cpe'` (C.P.E. Bach). This keeps `value` human-readable while avoiding collisions.

**Same-surname display collisions** (e.g. Robert and Clara Schumann): the slug convention above only
disambiguates the internal `value` key, not the displayed `lastName` — the default last-name-only
rendering would show "Schumann" for both if they appear in the same list. Since `lastName` is just a
free-text display string (not enforced to be a bare surname), disambiguate it directly when adding
entries known to collide: `lastName: 'R. Schumann'` / `lastName: 'C. Schumann'`. Same pattern applies to
the Bach family: `lastName: 'J.S. Bach'` / `lastName: 'C.P.E. Bach'`. This is a data-entry convention for
whoever maintains `composers.ts` — no runtime collision detection is implemented.

**No-composer sentinel entry**: for works with no attributed composer (e.g. an improvisation), add one
reserved entry to `COMPOSERS` rather than making `composer` optional on the block field:

```ts
{ value: 'no-composer', lastName: '', fullName: 'No composer' }
```

- `lastName: ''` — the default (last-name-only) rendering shows nothing for this entry: an empty
  string is falsy, so the same `{name && (...)}` check used for every other composer naturally renders
  a blank name column, keeping the group in the same two-column flow as every other group.
- `fullName: 'No composer'` does two jobs: the admin `ComposerSelectField` dropdown
  shows a clear, findable label instead of a blank option, and if an editor has the block's
  `showFullNames` on, the group shows "No composer" instead of blank — arguably more
  informative in that mode, not a bug.
- No `birthYear`/`deathYear` — years render as nothing, automatically, no special-casing needed.

This keeps `composer` **required** on `ComposerGroup` (see section 2) rather than optional, which
matters for a specific reason: if `composer` were optional, a render-time lookup miss (composer set to
a `value` that was renamed/deleted from `COMPOSERS` — the exact stale-reference risk described above)
would be visually indistinguishable from a deliberate no-composer group, since both would produce an
empty name column. With `composer` required and a real, permanent `no-composer` entry always present
in `COMPOSERS`, that ambiguity doesn't exist: a legitimate no-composer group always resolves
successfully (it has a real matching entry), so any lookup miss is unambiguously a stale reference —
consistent with the "assumed to always succeed" policy above, no exceptions to reason about.

It also makes `hideComposerName` (section 2) a true no-op on a `no-composer` group with zero special
code: checking that box suppresses an already-blank name column, no `admin.condition` gating needed.

No new collection, table, or migration. The developer (not editors) adds new composers by editing this
file and deploying — acceptable since the roster changes rarely and is explicitly something to be
hand-managed.

Trade-off vs. a `Composers` collection: editors cannot self-serve new composer names from the admin UI;
adding one requires a code change. In exchange, there's no new DB table/admin nav entry, and
birth/death years travel with each entry for free (looked up by `value` at render time, no relationship
population needed).

**Renaming/removing a `value`**: since only the developer maintains this file, it's their
responsibility to check for existing usage (e.g. dump Posts/Repertoire content via Payload Local API
and grep for the slug) before renaming or deleting an entry. No runtime fallback is implemented for a
stale/missing `value` at render time — the lookup is assumed to always succeed given the manual-check
discipline above; a broken reference is treated as a process mistake to avoid, not a case the code
defends against.

**Uniqueness**: `COMPOSERS.value` must be unique (it's used as a lookup key). Add a unit test asserting
no duplicate `value`s exist in the array — cheap, catches copy-paste mistakes when hand-adding entries.

**Select field UX at scale**: `composers.ts` may hold 100–200+ entries over time, too many for a plain
dropdown. See the custom `ComposerSelectField` component in section 2 below.

### Seeding the initial list from existing content

**Defined step, not optional cleanup.** Before implementation, audit existing Posts and Repertoire
content for composer names already mentioned in prose (e.g. dump content via Payload Local API —
`pnpm dump posts` / `pnpm dump repertoire` — and scan the text for composer name patterns). Output:
a candidate composer list (name, proposed `value` slug per the naming convention above, and
birth/death years where findable) presented to the user for review and approval **before** merging
entries into `composers.ts`. This is a one-time research/seed step, not an ongoing sync — existing
prose mentions aren't automatically converted into `WorksList` blocks; it only seeds the static list so
it isn't empty on day one.

## 2. `WorksList` block

New file: `src/blocks/WorksList.ts`. Registered in the `BlocksFeature` blocks array of:

- `src/collections/Posts.ts` (alongside `VideoEmbed, AudioEmbed, EventDates`)
- `src/collections/Repertoire.ts` (alongside `VideoEmbed, AudioEmbed`)

Not added to Pages (no custom richText editor/BlocksFeature config exists there yet — out of scope,
separate future work) or Recordings (its richText field explicitly documents "no embedded media
allowed" and also has no custom editor config yet — out of scope).

### Structure

```
WorksList (slug: worksList)
├─ title: text, optional                    — optional heading, e.g. a concert program's
│                                              "Season Opening Gala" or a repertoire section
│                                              title. Not marked localized: the parent richText
│                                              field is already localized, so the whole block
│                                              tree — including this field — is stored per-locale
│                                              for free; a nested localized:true flag here would
│                                              be dead config.
├─ showFullNames: checkbox, optional, default false
│                                            — override only: last-name display is the global
│                                              default for every group in this block instance;
│                                              checking this box overrides that default to full
│                                              names for the whole instance (falls back to
│                                              lastName if fullName is unset for an entry).
│                                              hideComposerName (below) takes precedence over
│                                              this per group — if a group's composer name is
│                                              hidden, showFullNames has no effect on that group.
└─ items: blocks field, required, minRows: 1
     ├─ ComposerGroup (slug: composerGroup)
     │    ├─ composer: select, required, options generated from COMPOSERS
     │    │            (value = Composer.value, label = Composer.fullName ??
     │    │             Composer.lastName, so the dropdown itself always shows an
     │    │             unambiguous name even when the list renders last-name-only;
     │    │             lastName/fullName/birth/death looked up from COMPOSERS by
     │    │             value at render time, not stored per-row. Works with no
     │    │             attributed composer use the reserved `'no-composer'`
     │    │             entry from COMPOSERS (see section 1) — composer stays
     │    │             required here rather than becoming optional, so any
     │    │             lookup miss is unambiguously a stale reference, never a
     │    │             deliberate no-composer case.
     │    │             Custom admin Field component (not the stock select UI):
     │    │             shows no options until 3+ characters are typed, then
     │    │             filters COMPOSERS by fullName/lastName match. Needed
     │    │             because react-select's default type-ahead has no
     │    │             minimum-input gate, and a 100-200+ entry list dumped
     │    │             open by default is unusable at that scale.)
     │    ├─ hideComposerName: checkbox, optional, default false
     │    │            — per-group override: suppresses the composer name/years
     │    │              from rendered output for this group only. Useful when
     │    │              the whole list is one composer already named elsewhere
     │    │              (e.g. the block's own `title`, or the post title) and
     │    │              repeating it feels redundant. On a `'no-composer'`
     │    │              group this is a true no-op — the name column is already
     │    │              blank, no special-casing needed.
     │    └─ works: array, required, minRows: 1
     │         └─ work
     │              ├─ title: richText, required
     │              │         restricted lexicalEditor: Paragraph, Bold, Italic
     │              │         only. No headings/lists/links/media — matches
     │              │         Repertoire's restricted-editor pattern (LinkFeature
     │              │         intentionally excluded). Bold/Italic support mixed
     │              │         formatting within one work entry, e.g. an
     │              │         italicized title followed by plain descriptive
     │              │         text ("*Légende*, for trumpet and piano").
     │              └─ movements: array, optional, no minRows (zero is valid —
     │                       most works have none)
     │                   └─ movement: text, required
     │                             plain text, not richText — movements are
     │                             short labels (e.g. "I. Allegro"); the
     │                             renderer applies small/italic styling
     │                             uniformly, so per-line rich formatting isn't
     │                             needed.
     └─ Pause (slug: pause)
          └─ (no fields — pure marker block; renderer hardcodes the
              "Pause" / "Intermission" label per locale). Used for concert
              programs; not used in a plain repertoire listing.
```

A composer can appear in more than one `ComposerGroup` within the same list (e.g. interrupted by a
`Pause`, or by another composer's group in between) — groups are independent, nothing enforces one
group per composer.

Requirements this structure covers:
- **Single-composer program or repertoire section**: one group, with as many works in its `works`
  array as needed. Composer renders once regardless of how many works follow.
- **Multiple works for the same composer**: the group's `works` array holds all of them; no need to
  repeat the composer selection per work.
- **Plain repertoire listing**: any number of `ComposerGroup` items with no `Pause` blocks at all —
  the `Pause` sub-block is simply not inserted when it isn't needed.
- **No attributed composer** (e.g. an improvisation, a traditional/anonymous piece): select the
  reserved `'no-composer'` entry (see section 1). Renders with a blank name column but stays in the
  same two-column flow as every other group (see rendering rules) — distinct from `hideComposerName`,
  which removes the column entirely for a group that does have a real, named composer.
- **Work movements**: a work's `movements` array holds each movement as its own short line, rendered
  indented under that work's title in small italic text. Not strictly one-movement-per-entry: since
  `movement` is plain text, an editor can just as validly type several movements condensed onto one
  line (e.g. `"I. Allegro — II. Andante — III. Allegro"` as a single array entry) when that reads
  better — no separate feature or field needed for this, it's just how the data is entered.

Notes:

- A nested `blocks` field (not a plain `array`) is used for `items` specifically so editors can freely
  reorder and interleave `ComposerGroup` and `Pause` rows in one sequence — Payload's blocks field is
  designed for exactly this "picker of row types" case.
- `items` needs a server-side `validate` enforcing at least 1 row, following the same rationale as
  `EventDates.validateEventDates` (Payload's `minRows` is UI-only, not API-enforced) — but implementer
  must verify Payload's `BlocksFieldValidation` signature against `ArrayFieldValidation` rather than
  copy-pasting the array-field version blind; the two field types may pass different value shapes.
- `works` (inside `ComposerGroup`) is a plain `array` field and needs the same kind of server-side
  `validate` enforcing at least 1 row (`EventDates.validateEventDates`-style, since `minRows` is
  UI-only there too). `movements` (inside a work) has no `minRows` requirement — zero movements is the
  common case and perfectly valid, no validate needed there.
- No `defaultValue` seeding on insert, for either `items` or `works`. `EventDates`' `defaultValue:
  [{}]` trick (seed one empty row so a fresh block isn't born failing minRows) doesn't cleanly
  transfer: `items` is a discriminated `blocks` field, so a bare `{}` row has no `blockType`; and even
  a seeded `ComposerGroup` or work row would still fail validation immediately because `composer` and
  `work.title` are both required and unset. Both are left empty by default; editors add at least one
  row manually and see the minRows validation error until they do.
- Export a `WorksListBlockFields`-style TS interface (mirrors `EventDatesBlockFields`) since block
  field shapes inside richText JSON aren't part of generated `payload-types`.
- New file `src/collections/components/ComposerSelectField.tsx` (alongside other custom field
  components under `src/collections/components/`, e.g. `VideoLinkRowLabel.tsx`,
  `GalleryImageRowLabel.tsx`): client Field component using Payload's `admin.components.Field`
  override on the `composer` field. Wraps react-select (or Payload's underlying select UI) with
  `filterOption`/input-gating logic so no options render until the editor has typed 3+ characters,
  then filters `COMPOSERS` by `fullName`/`lastName` substring match.

## 3. Frontend rendering

New component: `src/components/blocks/WorksList.tsx`, following the existing `EventDates`/`AudioEmbed`
component pattern. Uses Tailwind utility classes directly (matching `VideoEmbed.tsx`'s convention,
rather than a separate stylesheet).

Design validated via a temporary prototype route (`src/app/(frontend)/works-list-prototype/`, not
part of this feature — deleted once ported) covering ~12 rendering scenarios plus a repertoire-style
example. Key decisions from that process:

Implementation may factor the "one work's title + its movements" markup (shown duplicated across the
`hideComposerName`/normal branches in the JSX below) into a small internal helper component, as the
prototype does — both branches render works identically, only the surrounding name-column wrapper
differs.

Wired into `src/components/ui/PayloadRichText.tsx`'s `blocks` converter map, same pattern as
`eventDates`:

```tsx
worksList: ({ node }: { node: SerializedLexicalNode & { fields: WorksListBlockFields } }) => {
  return <WorksList {...node.fields} locale={locale as 'de' | 'en'} />
},
```

### Layout: flexbox, not CSS Grid

Each `ComposerGroup` renders as its own flex row: a fixed-width name column + an independent works
stack, **not** a shared CSS Grid where every group's rows participate in the same grid tracks. This
was a deliberate correction during prototyping — an earlier CSS Grid approach (composer name
`grid-row`-spanning across a group's rows) caused two real problems: (a) a composer name that wraps
across many lines (an unusually long name) could stretch row heights unevenly across the group,
leaving stray blank space next to short works, and (b) collapsing to a single mobile column caused
"phantom" empty grid rows from placeholder cells. Flexbox avoids both: the works stack's height is
purely its own content, independent of how tall the name wraps.

```
{hideComposerName ? (
  <div className="flex flex-col gap-1">  {/* ComposerGroup, hideComposerName: no name column at all */}
    {works.map(work => (
      <div className="pl-4 -indent-4">
        {work.title}
        {(work.movements ?? []).map(m => <div className="pl-8 -indent-4 text-xs italic">{m}</div>)}
      </div>
    ))}
  </div>
) : (
  <div className="flex flex-col items-start gap-1 md:flex-row md:gap-6">  {/* ComposerGroup, normal */}
    <div className="font-semibold md:w-48 md:shrink-0">{name} {years}</div>
    <div className="flex flex-col gap-1">
      {works.map(work => (
        <div className="pl-4 -indent-4">
          {work.title}  {/* hanging indent */}
          {(work.movements ?? []).map(m => <div className="pl-8 -indent-4 text-xs italic">{m}</div>)}
        </div>
      ))}
    </div>
  </div>
)}
```

The "normal" branch above also covers the `'no-composer'` case with zero extra code — `name`/`years`
just resolve to empty/blank for that entry, same lookup as any other composer (see below). Only
`hideComposerName` needs its own distinct branch, since it genuinely removes the column rather than
rendering it blank.

- **Name column width**: fixed `md:w-48` (12rem/192px), not content-based `auto` sizing. This is a
  **hardcoded-width coincidence, not a flexbox alignment guarantee** — flexbox has no shared-track
  concept between independent sibling `ComposerGroup` containers the way CSS Grid's shared column
  tracks did. Every group's name column independently computes to exactly 192px regardless of its own
  content, so they happen to land in the same horizontal position on the page; this would be equally
  true of any unrelated elements sized to a fixed 192px. **If this width is ever changed to
  content-based sizing** (e.g. `md:w-auto`, to avoid whitespace next to short names), cross-group
  alignment will break immediately and silently — each group's name column would then size
  independently to its own content, with no fallback to catch the misalignment.
- **Mobile (below `md`)**: `flex-col` — composer name stacks directly above its works, no column
  layout at all. Continuation works (2nd, 3rd, ... in the same group) have no separate name element
  to worry about, since the works stack is a single nested flex column independent of the name.
- **Hanging indent** (`pl-4 -indent-4`) on each work's title line: if a work's richText wraps to
  multiple lines, the first line stays flush left and continuation lines indent — same convention
  used for citation-style hanging indents.
- **Movements**: rendered directly below the work's title line, one per line, with their own nested
  hanging indent (`pl-8 -indent-4`, scaled from the title's `pl-4 -indent-4` to sit one level deeper)
  and styled small/italic (`text-xs
  italic`) — visually subordinate to the work title above them. No movements array or an empty one
  renders nothing extra. Use `(work.movements ?? []).map(...)`, not a bare `.map`, since richText block
  JSON isn't schema-migrated — if `movements` is ever added to `work` after some `WorksList` block
  instances already exist in saved content, those older instances won't have the key at all
  (`undefined`, not `[]`) and a bare `.map` would throw.
- **`'no-composer'` groups**: no distinct code path (see JSX above) — contrast with
  `hideComposerName` immediately below, which does have its own branch.
- **`hideComposerName` groups**: render only the works stack (`flex flex-col gap-1`), no name column
  at all — full removal, not a blank/empty name cell. On both mobile and desktop this looks identical
  to a normal group's works stack, just without the accompanying name.
- **`Pause`**: renders independently (not nested in a group), a flex row with a short fixed-width line
  (`h-px w-8`), the "Pause"/"Intermission" text, and another short fixed-width line of the same
  width — NOT a line stretching to fill the row's remaining width. Left-aligned as a compact unit, not
  centered.

### Spacing rhythm

- Within a group (between a group's own works): tight spacing, `gap-1` (0.25rem).
- Between different top-level items (a new `ComposerGroup` or a `Pause` starting): slightly larger,
  `gap-1.5` (0.375rem) — applied via the outer container's `gap-1.5` on a `flex flex-col`, not manual
  margin classes on content cells (an earlier margin-based approach double-counted the gap when a
  group's name+first-work pair collapsed from a shared row on desktop into two stacked rows on
  mobile — flexbox with a single outer `gap` on the item list avoids this entirely).
- Body text size: `text-sm leading-snug` (smaller than default body copy, tighter line height) —
  concert programs and repertoire lists are dense reference content, not prose.
- Composer's birth/death years, when shown: `text-xs text-gray-500 font-normal` (smaller and lighter
  than the composer name itself).

### Implementation gotcha: Unicode/special characters in JSX text

Discovered while prototyping: JS string-escape sequences (`\u2014` for em dash, `\u00e9` for é, etc.)
only decode inside actual JS string literals — they do **not** decode inside raw JSX text content.
`<em>Path\u00e9tique</em>` renders the six literal characters `\u00e9`, not "é", because JSX children
are treated as literal text (like HTML), not a JS string. This matters anywhere hardcoded example/seed
data or component markup includes special characters directly as JSX children (accented letters, em
dashes, curly quotes): either type the literal character directly (e.g. `<em>Pathétique</em>`, matching
how this codebase already writes composer names like `Dvořák`), or use an HTML entity (`&eacute;`), but
never a `\uXXXX` escape outside of an actual string literal (e.g. the `movements: string[]` array,
where escapes work correctly since those values are genuine JS strings).

### Rendering rules

- If `title` is set, render it as a heading above the list.
- Each `ComposerGroup` renders as described above (name column + works stack, or works-stack-only if
  `hideComposerName`).
  - `Composer Name` display: `fullName` if the block's `showFullNames` is checked (falling back to
    `lastName` if `fullName` is unset for that entry), otherwise `lastName`. For the `'no-composer'`
    entry this naturally resolves to blank (or "No composer" if `showFullNames` is on) — no special
    casing, same lookup as any other composer. Not rendered at all if the group's `hideComposerName`
    is checked (see precedence note in section 2).
  - Composer's `birthYear`/`deathYear` are looked up from `COMPOSERS` by the stored `value`. Year
    formatting: both present → `(1956–2020)`; only `birthYear` present (living composer) →
    `(b. 1956)`; only `deathYear` present → `(d. 2020)`; neither present → no parenthetical at all
    (the case for `'no-composer'`, which has neither). Not rendered at all when `hideComposerName` is
    checked.
  - Each work's `title` renders with a hanging indent; any `movements` render beneath it, one per
    line, small/italic and further indented (see layout section above).
- Each `Pause` renders the left-aligned short-line / text / short-line divider described above,
  reading "Pause" (de) / "Intermission" (en), locale-driven like other blocks (`VideoEmbed`,
  `EventDates`).
- List order is whatever order `items` are in — no re-sorting, alphabetizing, or grouping/deduping of
  repeated composers by the renderer. If an editor wants a repertoire list in alphabetical-by-surname
  order, they order the `ComposerGroup` items themselves when building the block content.

## Explicitly out of scope

- Performers/soloists in this block (handled elsewhere via Repertoire's `artists` relationship)
- Pages support (no custom richText editor config exists there yet)
- Recordings support (richText field there explicitly says "no embedded media allowed"; no custom
  editor config exists there yet either)
- `sortName`/birth-death years driving any alphabetized composer index elsewhere — this spec only
  covers storing and rendering years inline in the list
- Editor self-service composer additions from the admin UI (deliberately deferred to the static list
  trade-off above)
- Automatic alphabetical ordering or same-composer-group merging/deduping — editors control `items`
  order manually
