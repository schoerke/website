# Format Content: Split Paragraphs at Linebreaks Design

Date: 2026-09-19
Status: Approved

## Summary

Extend the existing `FormatContent` feature (currently: removes empty paragraphs) to also split
any paragraph containing direct-child `linebreak` nodes into multiple sibling paragraphs — one per
line — discarding the linebreak nodes. This addresses a real content-quality gap found in post 268
(DE locale): the author used Shift+Enter (a soft line break) instead of Enter, squashing two
logical paragraphs into one Lexical `paragraph` node with an internal `linebreak` node and a link.
The EN version of the same post was manually corrected by a human into two separate `paragraph`
nodes with no `linebreak` node at all — that's the target output shape this feature produces
automatically.

## Scope

- Applies to the same content this feature already applies to: Posts' `content` rich-text field,
  triggered by the existing Format action (wand icon / slash-menu `formatContent` command). Not a
  new, separate action.
- Only splits on `linebreak` nodes that are **direct children** of a `paragraph` node. Linebreaks
  nested inside inline formatting spans or links are explicitly out of scope and left untouched.
  Verified against real production content: a live scan of all 255 posts (DE locale, local
  `dev.db`) found 1,860 direct-child linebreaks and zero nested-in-link/span linebreaks. This
  scoping decision has zero known impact on current content; it's accepted as a narrow,
  low-likelihood future gap (e.g. content pasted from Word/Google Docs) rather than a live problem.
- No new automated test infrastructure for the live Lexical editor plugin. The live plugin
  (`feature.client.tsx`) has zero automated test coverage today — only the pure JSON-node function
  (`formatContent.ts`) is unit-tested, and the module's own doc-comment already establishes that
  the live plugin must be manually kept in sync with the pure function's semantics. This design
  extends that existing convention rather than introducing new test tooling.

## Detection & Split Rule (pure function)

New exported function in `src/features/formatContent/formatContent.ts`:

```typescript
function splitParagraphsAtLinebreaks(children: unknown[]): unknown[]
```

For each item in the top-level `children` array:

- If it is not a `paragraph` node, or its `children` field is not an array, pass it through
  unchanged. This check reuses the existing `isNode` guard from this file: a top-level array item
  must satisfy `isNode(item) && item.type === 'paragraph'` before being treated as a paragraph at
  all — anything else (`null`, a primitive, or an object missing `type`) is passed through
  unchanged by this same branch, never dereferenced further. (Matches `postContent.ts`'s
  established defensive convention of guarding `Array.isArray` before iterating — a malformed
  `children` field must never throw, since this function also runs in the live editing path via
  the mirrored plugin logic, and a throw there would break the Format button for the whole
  document.)
- If its `children` array contains no `linebreak`-typed items, pass it through unchanged (same
  object reference, no reallocation).
- Otherwise, split the `children` array into segments at each `linebreak` item (the linebreak
  items themselves are discarded, not carried into any segment), and emit one new paragraph object
  per segment: `{ ...originalParagraph, children: segment }`. This preserves every other
  paragraph-level attribute from the original node (`direction`, `format`, `indent`, `version`,
  `textFormat`, `textStyle`) unchanged, applying the same set to every resulting segment.

This function performs a single, non-recursive pass over one paragraph's *direct* children only —
it does not walk descendants. Unlike `postContent.ts`'s deep-walk functions (`hasValidDescendants`,
`scanParagraphForDateUrl`), it does not need a cycle/depth guard, because there is no recursion for
a cycle to occur in.

`formatContentRoot` is updated to compose both steps in order:

```typescript
export function formatContentRoot(children: unknown[]): unknown[] {
  return splitParagraphsAtLinebreaks(children).filter((child) => !isEmptyParagraph(child))
}
```

Split runs first; the existing `isEmptyParagraph` filter then removes any resulting empty-children
segments (from a leading, trailing, or doubled linebreak) in the same composed pass. This is
consistent with the existing behavior that a paragraph containing only a linebreak is already
treated as empty (existing test: `'detects a paragraph with only a linebreak as empty'`) — a
paragraph with *only* linebreak children now goes through split (producing all-empty segments)
before removal, rather than being caught directly by `isEmptyParagraph` on the original node; the
net result (the paragraph disappears entirely) is unchanged and intentional, not a behavior
regression.

**Naming note (to prevent a future bug):** `format` exists as two same-named, differently-typed
fields — a paragraph-level string (`ElementFormatType`, e.g. `'start'`) and a per-text-node numeric
bitmask (bold/italic/etc., e.g. `format: 0`). The `{ ...originalParagraph, children: segment }`
spread only copies the paragraph-level string `format`; per-text-node numeric `format` values
travel untouched inside each segment's own objects. Do not conflate these two fields in future
edits to this function.

**Note on blind-spread scope:** `{ ...originalParagraph, children: segment }` copies every field
present on the source object, not just the five named above. Verified against this project's
actual serialized paragraph shape (`ElementNode.exportJSON()` and the existing `paragraph()` test
fixture): paragraphs never carry an `id` field today, so copying the same value onto multiple new
sibling segments is currently a non-issue. If a paragraph-level `id` (or any other field requiring
per-node uniqueness) is ever introduced to this shape, this spread would need explicit handling to
avoid duplicating it across the new segments.

## Live Plugin (`feature.client.tsx`)

Mirror the same logic using real Lexical node classes, inside the existing `editor.update()`
transaction in `formatDocument()`, run **before** the existing empty-paragraph-removal step, with
`root.getChildren()` re-read **after** the split mutation completes (not reused from before it):

```typescript
editor.update(() => {
  const root = $getRoot()
  splitParagraphsAtLinebreaksLive(root) // mutates: inserts new paragraphs, removes split originals
  const children = root.getChildren() // re-read AFTER split, not the stale pre-split snapshot
  const toRemove = children.filter(isRemoveableEmptyParagraph)
  // Never reduce the document to zero children (content is required).
  if (toRemove.length === children.length) return
  for (const child of toRemove) child.remove()
})
```

This ordering is load-bearing: if `children` were captured before the split ran, the "never delete
everything" guard (`toRemove.length === children.length`) would compare against the wrong (smaller,
pre-split) count, potentially allowing or blocking removal incorrectly once splitting has changed
the true paragraph count.

`splitParagraphsAtLinebreaksLive(root)`, for each top-level `ParagraphNode` containing at least one
`LineBreakNode` direct child:

- Builds one new `ParagraphNode` per segment (segments delimited the same way as the pure
  function, by direct-child `LineBreakNode`s).
- Copies **all five** paragraph-level attributes from the original onto every new segment
  paragraph, to match the pure function's full-object spread exactly: `getFormatType()` →
  `setFormat()`, `getIndent()` → `setIndent()`, `getDirection()` → `setDirection()`,
  `getTextFormat()` → `setTextFormat()`, `getTextStyle()` → `setTextStyle()`. (All five getter/setter
  pairs are confirmed present on `ElementNode`, which `ParagraphNode` extends, in this repo's
  vendored `lexical` package.) Omitting `textFormat`/`textStyle` here would silently diverge from
  the pure function's behavior on any paragraph carrying custom text formatting/style — both must
  be copied.
- Moves each segment's child nodes into its new paragraph via `.append()`. Lexical's
  `ElementNode.append()` internally calls `splice()`, which performs the standard Lexical
  node-move/re-parenting dance (detach from old parent, attach to new) — this is the same
  mechanism Lexical itself uses for node moves elsewhere. No manual `.remove()` call on a child
  before `.append()`-ing it elsewhere is needed or correct; that would be redundant/could
  double-detach against `splice()`'s own bookkeeping.
- Inserts the new paragraphs as siblings via `insertAfter()`, each one inserted after the
  previously-inserted new paragraph (the first new paragraph is inserted after the original; the
  second is inserted after the first new paragraph; and so on) — **not** by calling `insertAfter()`
  repeatedly against the original node, which would insert every new paragraph directly after the
  original and silently reverse segment order. Then removes the (now childless) original paragraph.

Because both the split and the empty-removal happen inside one `editor.update()` call, Lexical's
default history behavior merges them into a single undo/redo step — one Format click remains one
`Ctrl+Z`. This is inherited "for free" from the existing single-`editor.update()`-call structure;
a future refactor that splits this into two separate `editor.update()` calls would break that
single-undo-step UX and must be avoided.

## Keep-in-Sync Requirements (extend the existing doc-comment)

The existing doc-comment at the top of `formatContent.ts` already warns that "empty paragraph"
semantics must be kept in sync between the pure function and the live plugin. Extend it to cover
two more things this feature introduces:

1. Direct-child-only linebreak-split scoping (nested linebreaks inside inline spans/links are
   never split, in both implementations).
2. The full paragraph-attribute preservation set that must be copied onto every split segment in
   both implementations: `direction`/`format`/`indent`/`textFormat`/`textStyle`.

## Testing

Unit tests added to `formatContent.spec.ts` for `splitParagraphsAtLinebreaks` and the updated
`formatContentRoot`. The existing fixture helpers (`text()`, `paragraph()`, `linebreak()`, `tab()`,
`link()`) do not currently expose a way to build a bare text-node object outside of `text()`'s own
internals — a new `textNode(str)` helper (returning the bare `{ detail, format, mode, style, text,
type: 'text', version }` shape) will be needed alongside them to construct the mixed-children
paragraphs (text + linebreak + text + link, matching post 268's real shape) these tests require.

- A paragraph with one linebreak splits into two paragraphs, each preserving the original's
  paragraph-level attributes.
- A paragraph with no linebreak passes through unchanged.
- Non-paragraph nodes (blocks, headings) pass through unchanged even if adjacent to a paragraph
  that does split.
- Multiple linebreaks split into multiple (3+) segments, in the original order (guards against the
  `insertAfter()` order-reversal footgun described above, at the pure-function level).
- Consecutive (doubled) linebreaks produce an empty-children (`children: []`) middle segment,
  which the composed `formatContentRoot` removes — confirmed distinct from today's only-tested
  "paragraph without a `children` key at all" empty case, since `children: []` exercises a
  different branch of `hasProtectedContent` (an empty array, not `undefined`).
- A leading linebreak (`linebreak, text`) and a trailing linebreak (`text, linebreak`) each produce
  one empty-children segment, removed by the composed filter, leaving only the non-empty segment.
- A paragraph containing only linebreak children (no text) splits into all-empty segments, all of
  which are removed — net result: the paragraph disappears entirely, matching today's existing
  behavior for this case (no regression).
- A paragraph containing a `link` node that has its own nested linebreak inside the link's own
  `children` array (not a direct child of the paragraph), plus a real top-level linebreak
  elsewhere in the same paragraph, splits correctly at the real linebreak only — the nested one is
  never found or touched, because the split operates on the flat top-level `children` array by
  index, not by deep search.
- Reproduces post 268 DE's real shape: text, then a linebreak, then more text, then a link — splits
  into two paragraphs matching the EN version's manually-corrected structure.
- A malformed paragraph (`children` not an array, or missing) passes through unchanged without
  throwing. A malformed top-level array item (`null`, a primitive, or an object with no `type`)
  also passes through unchanged without throwing.
- `formatContentRoot` composed end-to-end: a paragraph that splits into multiple segments, some of
  which are empty, correctly produces the final expected children array in one call (split, then
  filter, verified together — not just each half in isolation).

## Verification

- `pnpm test` (targeted: `formatContent.spec.ts`, plus the full suite to confirm no regressions
  elsewhere)
- `pnpm typecheck`
- `pnpm lint`

## Out Of Scope

- Splitting on linebreaks nested inside inline formatting spans or links.
- Automatic/as-you-type splitting — this stays a manual, explicitly-triggered Format action (button
  or slash-menu command), matching the existing feature's UX.
- Adding automated test infrastructure (e.g. a headless Lexical editor harness) for the live
  plugin. The live plugin remains manually verified against the pure function's behavior, per the
  existing convention in this file.

## Known Limitations

- **Nested linebreaks inside inline spans/links are silently left unsplit**, in both the pure
  function and the live plugin. Verified zero occurrences across current production content (255
  posts, DE locale, local `dev.db`) as of this writing. If content is ever introduced with this
  shape (e.g. pasted from an external editor), the paragraph will pass through unchanged rather
  than being split or causing an error — a silent no-op, not a crash.
- **The live plugin has no automated test coverage**, consistent with its existing (pre-this-change)
  state. Correctness of the live implementation depends on it faithfully mirroring the pure
  function's tested behavior, per the file's existing (and now extended) keep-in-sync doc-comment.
- Splitting can change which node is "first" or "last" for `postContent.ts`'s structural validation
  purposes (e.g. a post whose first paragraph starts with a leading linebreak has its now-empty
  first segment removed, promoting the next segment to be the new first node). This is the
  intended effect of running Format, not a bug.
- **Pure vs. live "delete everything" behavior is pre-existing and intentionally asymmetric, and
  this feature does not change that.** The live plugin's `formatDocument()` refuses to remove every
  child of the document (`if (toRemove.length === children.length) return`); the pure
  `formatContentRoot` has no equivalent guard and can legitimately return an empty array (existing
  test: `'returns an empty array when everything is empty'`). This asymmetry predates this design
  and is unaffected by adding the split step — splitting only changes which/how many paragraphs
  exist before either function's empty-removal logic runs, not this existing divergence in
  removal-guard behavior between the two implementations.
</content>
