# PerformersList Rich Text Converter Design

Date: 2026-09-04
Status: Revised after review

## Summary

Only begin this plan after the preceding block plan has delivered: `src/blocks/PerformersList.ts`,
the Posts `BlocksFeature` registration, `PerformersList` renderer + `PayloadRichText` converter,
required generated artifacts (only if affected), and passing block tests. Then add a Posts-only
Lexical editor action that converts selected performer/ensemble lines into one
`performersList` block (see `docs/superpowers/specs/2026-09-04-performers-list-design.md`). Mirrors
the existing `EventDatesConversionFeature` (see
`docs/superpowers/specs/2026-09-03-eventdates-converter-design.md`): editors select lines, review and
correct parsed rows in a drawer, then confirm — selected source paragraphs are replaced by one block in a single
Lexical transaction.

Target input shape (post 116):

```
Tianwa Yang | Violine
Trio Catch
Martin Adámek | Klarinette
Eva Boesch | Violoncello
Sun-Young Nam | Klavier
```

## Scope

- Posts `content` rich text editor only (Repertoire editors create blocks manually).
- Source selection must fully cover consecutive paragraph nodes, or every line in one paragraph
  separated by Lexical linebreak nodes (Shift+Enter).
- List items are excluded (same as EventDates converter — a block node can't replace list-item
  children without splitting their enclosing list).
- Existing `PerformersList` block schema and frontend renderer remain unchanged.
- No collection/schema change, migration, generated types, API route, or database operation.

## Editor Flow

1. Editor selects consecutive performer lines (paragraphs or Shift+Enter lines in one paragraph).
2. Floating inline toolbar's `Formatting utilities` dropdown exposes `Convert to PerformersList`
   for any eligible non-empty range selection.
3. The feature validates the selection, then reads each selected node's visible text.
4. A review drawer lists one draft row per source line: editable name, instrument, and — for group
   rows — editable nested member rows.
5. Editor corrects parsed values, adds/removes members from a group, and reorders as needed.
6. On confirmation, all reviewed rows replace their selected source paragraphs with a single `performersList`
   block.
7. Rows missing required fields block confirmation and show their error in the drawer. Deleted source
   rows show a persistent deletion count/warning and require an explicit acknowledgement before conversion.
8. Cancel leaves the editor document untouched.

The document replacement runs in one Lexical transaction so one Undo restores all replaced source
nodes.

## Components

### PerformersListConversionFeature

Paired Payload feature registered only in `Posts.content`, following `EventDatesConversionFeature`:
a `createServerFeature` provider with a stable feature key serializes configuration, while an
import-map-safe `createClientFeature` provider supplies the toolbar action and editor plugin.
Register it with the other converter feature and `BlocksFeature`. Do not depend on physical adjacency:
once both EventDates and PerformersList converters exist, only one can be immediately before
`BlocksFeature`. Add a combined feature-order test with both converters and `BlocksFeature`, proving
`blocks` loads before both client plugins. The feature validates the selection, extracts source nodes,
opens the review drawer, and performs the final Lexical transaction. Generate the Payload import map
after adding the converter's project-local client component reference.

### parsePerformersListLine

Pure parser accepting source text. Returns either a parsed row or a reason for rejection. No Lexical
or React dependency. Used by the drawer for initial row values; editors may edit freely afterward.

### PerformersListConversionDrawer

Admin UI drawer showing one editable row per selected source line. Exposes name, instrument, nested
members (for group rows), and row status. Returns editor-corrected
valid rows to the feature, but never writes Lexical state itself.

#### Native Payload layout

Use Payload's existing `Drawer`, `Button`, and `TextInput` controls and theme variables. Do not add a
separate visual language (custom dark cards, badges, yellow rails, or icon-only action controls).
The Payload drawer already supplies the page title; do not render a duplicate inner heading.

- Each row uses the existing light bordered container. Name/instrument inputs and an action cluster share
  one flex row; Up/Down use compact icon buttons and a native `...` menu holds Add/Remove group and Delete.
- Group members render as an indented standard row list. Keep this structural indent only; no colored
  rail/panel treatment.
- Keep source text and row/member ordinal in accessible labels, but do not render source lines above fields.
  Visible labels remain `Name`, `Instrument`, and `Group name`.
- Preserve all existing keyboard controls, disabled-boundary behavior, error associations, focus targets,
  and acknowledgement requirements.

## Parsing Rules

- Split a line on the pipe separator. Accept both `|` (spaces) and `|` (no spaces); split on the
  **first** pipe. Thus `A | B | C` becomes name `A`, instrument `B | C`; pipes in names are unsupported.
- `Name | Instrument` → `performer` with `name` = left side, `instrument` = right side, both trimmed
  (including Unicode/non-breaking whitespace). Empty instrument after a pipe (trailing `"Name |"`)
  parses as a performer with no instrument (the block's `instrument` is optional). Empty name
  (`"| Violine"`) becomes an invalid editable performer row.
- No pipe → `ensembleGroup` with `groupName` = trimmed line. A pipe-less line is ambiguous
  (soloist without instrument vs. group heading); it defaults to `ensembleGroup` and the editor
  remains an ensemble group; editors can adjust block structure after conversion if needed.
- Reject empty/whitespace-only lines (not selectable in practice — an empty paragraph line).
- No other grammar: everything that isn't pipe-separated becomes a group row by the default above.
  Lines that are program content (e.g. "Programm" or a works line) will parse as group rows; the
  editor removes those rows in the drawer.

## Nesting Rules

- Performer rows that immediately follow a group row auto-nest as that group's `members` — until the
  next group row or the end of the selection.
- Auto-nesting is a starting point, fully editable in the drawer: the editor can un-nest a member to
  a top-level performer, nest a top-level performer into a group, reorder members, and reorder
  top-level rows.
- A group with zero members after editing is invalid (the block requires `members` ≥ 1); the drawer
  surfaces the error and blocks confirmation.
- No drag-and-drop in v1. Controls are explicit and scoped: Up/Down reorders within the current
  top-level or member list; `Add to group` moves a top-level performer into the immediately preceding
  group; `Remove from group` promotes a member immediately after its group.
- Deleting a group promotes its members at that group position, preserving their order and values. No
  action silently discards members.

## Draft Model

The drawer's draft model is stricter and separate from persisted block fields. Each parsed source line
gets a stable `sourceId`, `originalText`, and optional `discardedLinkUrl`; these remain attached while a
row moves between top-level and group-member lists. This makes link-loss warnings reliable after
auto-nesting or manual moves.

`sourceId` is deterministic: `${paragraphKey}:${lineIndex}`, with `lineIndex` zero-based within its
source paragraph. Shift+Enter lines share a paragraph key but never their `sourceId`. Snapshots retain
the ordered source lines and their `sourceId`s; the drawer uses `sourceId` as its key, never the
paragraph key alone.

Final conversion output has no optional structural fields:

```ts
type ConvertedPerformer = {
  blockType: 'performer'
  name: string
  instrument?: string
}

type ConvertedGroup = {
  blockType: 'ensembleGroup'
  groupName: string
  members: { name: string; instrument?: string }[]
}

type ConvertedItem = ConvertedPerformer | ConvertedGroup
```

Validate this model before `editor.update`; convert it to the block-node factory's `items` value only at
the insertion boundary.

## Selection And Replacement

- List, mixed-node, non-consecutive, nested-list, decorator-node, partial-inline, and partial
  linebreak-paragraph selections are rejected with clear action feedback — reuse the selection
  utilities/logic from `src/features/eventDatesConverter/selection.ts` where the shape matches,
  generalizing if needed.
- Each source line permits text nodes and exactly one direct custom `LinkNode` (same inline-node rule
  as EventDates). Text is concatenated in document order, retaining no source formatting in the
  structured block.
- **Links are discarded**: a `performersList` row has no URL field, so a source line's link is
  dropped when the block is inserted (text only). The drawer surfaces the exact URL for
  every affected draft row, even after it becomes a group member. If one or more links are affected,
  confirmation requires an explicit acknowledgement checkbox; no silent loss.
- Confirmation requires every row to be valid: `performer` rows need a non-empty `name`;
  `ensembleGroup` rows need a non-empty `groupName` and ≥ 1 member each with non-empty `name`.
- Confirmation also requires at least one final top-level converted item. Deleting every draft row (or
  deleting the last remaining one) disables confirmation and leaves source paragraphs untouched; never
  insert `items: []`.
- Any validation error prevents conversion and preserves every source paragraph.
- The feature snapshots editor instance, rich-text field path, active locale, node keys, text
  fingerprints, parent, and sibling order before opening the drawer. Confirmation rechecks the exact
  node type, parent key, ordered keys, and text inside final `editor.update` and aborts with
  `Source changed` on mismatch. Moving/clearing the active selection alone is allowed; source mutation,
  reparenting, deletion, or reordering aborts conversion.
- The inserted `performersList` node uses existing block field names: `items`, with `performer` /
  `ensembleGroup` sub-blocks, `name`, `instrument`, `groupName`, `members`.
- Created with Payload's block-node factory using
  `{ blockType: 'performersList', blockName: '', items }`; the factory supplies the block id and
  serialized node metadata.
- Replacement operates on **selected source paragraphs**, not draft rows. For Shift+Enter input, all
  selected lines originate in one paragraph: after every line becomes output or is explicitly deleted,
  deduplicate paragraph keys and remove that one paragraph. Test three Shift+Enter lines becoming one
  block with no residual source paragraph.

## Error Handling

- Ineligible selections show action feedback and do not open the drawer.
- Parser failures remain visible per source row and never discard content.
- Drawer validation prevents insertion unless every row is complete (see Selection And Replacement).
- Deleting a draft row means "Remove from converted block; original line will be removed from document."
  When one or more rows are deleted, show the count persistently and require a deletion-loss
  acknowledgement before conversion. This is independent of link-loss acknowledgement.
- All row controls are native keyboard-operable buttons with unique accessible names containing source
  text or row context. Disable Up/Down at list boundaries; connect field errors with `aria-describedby`;
  after a top-level row delete, move focus to the next top-level row's Name input (or previous row's
  Name input, or drawer heading if no rows remain). After member delete, move focus to next member's
  Name input, then previous member's Name input, then parent group Name input if no members remain.
  Expose acknowledgement controls with affected-row counts.
- Canonicalize every parsed field for drawer display and final output: strip C0/C1 control characters,
  then trim Unicode whitespace from name, groupName, instrument, original-text display, and discarded
  link URLs. Preserve the original unmodified source text/link values in snapshots for stale checks.
- Discarded link URLs render as plain text/value only — never `href`, HTML, Markdown, or preview. Truncate
  visually if needed while preserving an accessible full value.
- Changes, deletion, reordering, editor/field/locale switching during drawer review abort
  confirmation rather than applying stale source-node keys.
- Construct and validate final items before `editor.update`; trim `name` / `groupName`, omit optional
  `instrument` when blank, and ensure at least one final item. Inside the transaction only stale-check,
  insert, and remove. Catch/report unexpected failures. A failed transaction leaves editor state unchanged.

## Testing

- Parser unit tests: pipe with/without spaces, performer with instrument, performer with empty
  instrument, pipe-less → group, whitespace-only rejection, first-pipe split and remaining pipes,
  empty left side, and Unicode/non-breaking whitespace.
- Nesting unit tests: performers after a group auto-nest; next group stops nesting; leading
  performers stay top-level; one group plus three members emits one group; top-level output order;
  reorder, add/remove group, and delete/promotion preserve every member.
- Feature tests: paragraph and linebreak eligibility; rejected list/mixed/non-consecutive/partial
  selections; source extraction (including formatting/link plain-text loss); stale editor/field/locale/
  selection rejection; emitted exact block JSON; one-step undo; redo; locale isolation; and three
  Shift+Enter lines becoming one block with no residual source paragraph.
- Drawer tests: parsed values, member editing, group-with-no-members error, explicit
  move controls, confirm gating, cancellation, link URL warning persistence after nesting, and required
  link-loss acknowledgement; deleted-row warning/count and acknowledgement; accessible control names,
  disabled boundary moves, error descriptions, and focus after deletion. Test linked deleted rows
  and linked retained rows together: both warning counts show and confirm stays disabled until both
  applicable acknowledgements are checked. Test delete-all/delete-last: confirm stays disabled, no
  transaction runs, sources remain untouched.
- Regression test: output matches `PerformersListBlockFields` and the existing renderer
  expectations.
- Editor-to-form integration test: first identify an existing Payload admin/form integration harness. If
  none exists, scope this as a follow-up rather than blocking converter delivery. Payload-backed
  save/reload coverage belongs to the preceding block plan/test environment; do not promise it as
  converter parity unless that environment exists.
- Combined feature-order test: EventDates converter + PerformersList converter + `BlocksFeature` loads
  `blocks` before both client plugins. Add a Posts config test proving Posts registers both converter
  feature keys and `PerformersList` in its `BlocksFeature`, then assert the sorted result.
- Factory test: assert exact serialized Payload block metadata: `type: 'block'`, `version: 2`, generated
  `fields.id`, `blockName: ''`, and flat `fields.items`; Unicode-whitespace normalization, blank
  instrument omission, control-character removal for performer/group/member fields, and no factory call
  for invalid or empty final output.

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Out Of Scope

- Conversion outside Posts content.
- List-item conversion or list splitting.
- Automatic conversion on paste or save.
- Persisting parser errors or draft conversion state.
- Automatic deletion of non-performer lines (e.g. a trailing "Programm" heading) — the editor
  removes those rows in the drawer.
