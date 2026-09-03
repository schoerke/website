# EventDates Rich Text Converter Design

Date: 2026-09-03
Status: Approved

## Summary

Add a Posts-only Lexical editor action that converts selected consecutive event-date lines into one
existing `eventDates` block. Editors review and correct parsed rows before source nodes are replaced.

## Scope

- Posts `content` rich text editor only.
- Source selection must fully cover consecutive paragraph nodes, or every line in one paragraph
  separated by Lexical linebreak nodes (Shift+Enter).
- List items are excluded. A block node cannot replace list-item children without splitting their
  enclosing list, which is out of scope for v1.
- Existing `EventDates` block schema and frontend renderer remain unchanged.
- No collection/schema change, migration, generated types, API route, or database operation.

## Editor Flow

1. Editor selects consecutive event-date paragraphs or all Shift+Enter lines inside one paragraph.
2. Floating inline toolbar exposes a gear-icon `Formatting utilities` dropdown for any non-empty range selection.
3. `Convert to Event Dates` validates selected nodes, then reads each selected node's visible text and link URL.
4. A review drawer displays source text, parsed date, location, URL, and row status.
5. Editor corrects parsed values as needed.
6. On confirmation, all reviewed rows replace their source nodes with a single `eventDates` block.
7. Invalid or ambiguous rows report their parse failure in the drawer and prevent conversion; source
   nodes remain untouched.
8. Cancel leaves the editor document untouched.

The document replacement runs in one Lexical transaction so one Undo restores all replaced source
nodes.

## Components

### EventDatesConversionFeature

Paired Payload feature registered only in `Posts.content`: a `createServerFeature` provider with a
stable feature key serializes configuration, while an import-map-safe `createClientFeature` provider
supplies the toolbar action and editor plugin. Payload 3.88 reverses priority-dependency traversal,
so `dependenciesPriority: ['blocks']` resolves in the wrong order. Register the converter immediately
before `BlocksFeature`; the public sorter then resolves `blocks` first. The converter validates the selection,
extracts source nodes, opens the review drawer,
and performs the final Lexical transaction. Generate the Payload import map after adding any
project-local client component reference.

### parseEventDateLine

Pure parser accepting source text and an optional URL. It returns either a parsed
`{ date, location, url }` row or a reason for rejection. It has no Lexical or React dependency.
It uses explicit regular-expression grammar and calendar validation, never implementation-dependent
`Date` parsing of source text.

### EventDatesConversionDrawer

Admin UI drawer showing one editable row per selected source node. It exposes parsed date,
location, URL, original text, and parse status. It returns editor-corrected valid rows to the
feature, but never writes Lexical state itself.

## Parsing Rules

- Recognize case-insensitive German and English full month names, their unambiguous common
  abbreviations, unambiguous numeric dates, and ISO dates. Normalize Unicode before matching.
- Allow conventional terminal punctuation after a date. Reject unsupported month spellings,
  ambiguous numeric order, and any format outside this grammar.
- Date must begin the source line and parser output is canonical
  `YYYY-MM-DDT12:00:00.000Z`, compatible with the existing day-only date field and UTC renderer.
- Numeric dates with ambiguous day/month order and dates without a year are rejected.
- Location is all text after the recognized date. Leading comma, dash, and whitespace are removed;
  a comma is not required.
- A custom external link URL in a source line becomes `url`; lines without links produce no URL.
- Internal, multiple, auto, and nested links are rejected and require editor correction to one
  external URL or no URL.
- Date ranges and relative-date phrases are rejected as ambiguous.
- A corrected row must include date and location. URL remains optional and continues through the
  existing block validation.

## Selection And Replacement

- List, mixed-node, non-consecutive, nested-list, decorator-node, partial-inline, and partial
  linebreak-paragraph selections are rejected with clear action feedback. All lines in one
  linebreak-separated paragraph are supported. A valid range starts at the first text node offset
  zero and ends at the last text node end, in either selection direction.
- Each source line permits text nodes and exactly one direct custom `LinkNode`; it rejects auto
  links, nested links, decorators, and other inline node types. Text is concatenated in document
  order, retaining no source formatting in the structured block.
- Confirmation requires every selected row to be complete and valid.
- Any parse or validation error prevents conversion and preserves every source node.
- The feature snapshots editor instance, rich-text field path, active locale, node keys, text/link
  fingerprints, parent, and sibling order before opening the drawer. Confirmation rechecks the
  exact node type, parent key, ordered keys, text, and link fields inside final `editor.update` and
  aborts with `Selection changed` on mismatch.
- The inserted `eventDates` node uses existing block field names: `events`, `date`, `location`,
  and optional `url`.
- It is created with Payload's block-node factory using
  `{ blockType: 'eventDates', blockName: '', events }`; the factory supplies the block id and
  serialized node metadata.

## Error Handling

- Ineligible selections show action feedback and do not open the drawer.
- Parser failures remain visible per source row and never discard content.
- Drawer validation prevents insertion unless every row has a valid canonical date, non-empty
  trimmed location, and optional trimmed valid HTTP(S) URL without username or password.
- Changes, deletion, reordering, editor/field/locale switching during drawer review abort
  confirmation rather than applying stale source-node keys.
- Failed transaction leaves editor state unchanged.

## Testing

- Parser unit tests: German/English long dates, numeric dates, ISO dates, optional separators,
  custom links, absent links, internal/multiple/auto/nested links, invalid dates, ranges, relative
  dates, malformed lines, leap years, ambiguous numeric dates, yearless dates, and canonical UTC
  output (`YYYY-MM-DDT12:00:00.000Z`).
- Feature tests: paragraph and linebreak eligibility; rejected list/mixed/non-consecutive/partial
  selections; source extraction; stale editor/field/locale/selection rejection; emitted exact block
  JSON; one-step undo; redo; and locale isolation.
- Drawer tests: parsed values, editor corrections, row errors, cancellation, URL validation, and
  confirm gating.
- Regression test: output matches `EventDatesBlockFields` and existing renderer expectations.
- Editor-to-form integration test: editor mutation serializes `fields.events` to Payload form
  state. Save/reload test: Payload validates and renders emitted block data, asserting
  `{ type: 'block', version: 2, fields: { id, blockType, blockName, events } }`.
- History integration mounts Payload's proxied `LexicalHistoryPlugin`, executes conversion, then asserts that
  `UNDO_COMMAND` restores exact source JSON and `REDO_COMMAND` restores exact block JSON.

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
- Handling event time, price, notes, sold-out state, or date ranges.
