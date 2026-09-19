# Format Content: Split Paragraphs at Linebreaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `FormatContent` feature so that, alongside removing empty
paragraphs, it also splits any paragraph containing direct-child `linebreak` nodes into multiple
sibling paragraphs — one per line — discarding the linebreak nodes.

**Architecture:** A new pure function `splitParagraphsAtLinebreaks` in
`src/features/formatContent/formatContent.ts` operates on the serialized JSON node shape and is
composed into `formatContentRoot` (split first, then the existing empty-paragraph filter). A
mirrored live implementation in `src/features/formatContent/feature.client.tsx` performs the same
split using real Lexical node classes, inserted into the existing `editor.update()` transaction
before the existing empty-paragraph removal step.

**Tech Stack:** TypeScript, Payload CMS 3 (`@payloadcms/richtext-lexical`, re-exporting `lexical`
0.50.0 verbatim via `export * from 'lexical'`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-format-content-split-linebreaks-design.md`

---

## Reference: Design Constraints (read before starting)

These are load-bearing decisions from the spec — do not deviate without checking the spec first:

1. **Direct children only.** Only `linebreak` nodes that are direct children of a `paragraph` node
   are split on. Linebreaks nested inside inline formatting spans/links are never touched, in
   either implementation.
2. **Malformed-input guard.** A top-level array item that is `null`, a primitive, or an object
   missing `type` must never be dereferenced as a paragraph — pass it through unchanged. A
   `paragraph`-typed node whose `children` field is not an array must also pass through unchanged.
   Neither implementation may throw on malformed input.
3. **Full attribute preservation.** Every split segment must carry forward all five
   paragraph-level attributes from the original: `direction`, `format`, `indent`, `textFormat`,
   `textStyle` (plus, in the pure function, anything else on the object via spread — there is
   nothing else today, verified against the real serialized shape).
4. **Segment order must be preserved.** In the live plugin, new paragraphs must be inserted in the
   same left-to-right order as the original segments — inserting each new paragraph after the
   *previously inserted* one, not repeatedly after the original node (which would reverse order).
5. **Execution order in the live plugin.** The split step runs first, fully mutating the tree.
   `root.getChildren()` is then read (or re-read) for the empty-paragraph-removal step — never
   reused from a snapshot taken before the split ran.
6. **No cycle/depth guard needed.** This function does a single, non-recursive pass over one
   paragraph's direct children only — it never walks descendants, so it doesn't need the
   `MAX_NODES_TO_SCAN`/`visited`-Set machinery used elsewhere in this codebase (e.g.
   `postContent.ts`).

---

## File Structure

- **Modify:** `src/features/formatContent/formatContent.ts` — add `splitParagraphsAtLinebreaks`
  (new exported function), update `formatContentRoot` to compose it with the existing
  `isEmptyParagraph` filter, extend the module's top-of-file doc-comment.
- **Modify:** `src/features/formatContent/formatContent.spec.ts` — add a new `textNode(str)` test
  helper, a new `describe('splitParagraphsAtLinebreaks', ...)` block, and new
  `formatContentRoot`-composed test cases.
- **Modify:** `src/features/formatContent/feature.client.tsx` — add
  `splitParagraphsAtLinebreaksLive`, wire it into `formatDocument()` before the existing
  empty-paragraph removal, with the required re-read ordering.

No new files. No changes to `Posts.ts`, `postContent.ts`, or any other collection/migration files.

---

### Task 1: `splitParagraphsAtLinebreaks` — pure function

**Files:**
- Modify: `src/features/formatContent/formatContent.ts`
- Test: `src/features/formatContent/formatContent.spec.ts`

- [ ] **Step 1: Add the `textNode` test helper and write the failing tests**

In `src/features/formatContent/formatContent.spec.ts`, add a new helper right after the existing
`link` helper (after line 33, before the `describe('isEmptyParagraph', ...)` block):

```typescript
const textNode = (str: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: str,
  type: 'text',
  version: 1,
})
```

Update the import line at the top of the file — replace:

```typescript
import { formatContentRoot, isEmptyParagraph } from './formatContent'
```

with:

```typescript
import { formatContentRoot, isEmptyParagraph, splitParagraphsAtLinebreaks } from './formatContent'
```

Then append this block at the end of the file (after the existing `formatContentRoot` describe
block's closing `})`):

```typescript

describe('splitParagraphsAtLinebreaks', () => {
  it('passes through a paragraph with no linebreak unchanged', () => {
    const original = paragraph([textNode('Hello')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([original])
  })

  it('passes through non-paragraph nodes unchanged', () => {
    const block = { type: 'block', version: 1 }
    const heading = text('Title', 'heading')
    expect(splitParagraphsAtLinebreaks([block, heading])).toEqual([block, heading])
  })

  it('splits a paragraph with one linebreak into two paragraphs', () => {
    const original = paragraph([textNode('First'), linebreak(), textNode('Second')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([textNode('First')]),
      paragraph([textNode('Second')]),
    ])
  })

  it('preserves paragraph-level attributes on every split segment', () => {
    const original = {
      children: [textNode('First'), linebreak(), textNode('Second')],
      direction: 'rtl',
      format: 'center',
      indent: 2,
      textFormat: 1,
      textStyle: 'color: red;',
      type: 'paragraph',
      version: 1,
    }
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      {
        children: [textNode('First')],
        direction: 'rtl',
        format: 'center',
        indent: 2,
        textFormat: 1,
        textStyle: 'color: red;',
        type: 'paragraph',
        version: 1,
      },
      {
        children: [textNode('Second')],
        direction: 'rtl',
        format: 'center',
        indent: 2,
        textFormat: 1,
        textStyle: 'color: red;',
        type: 'paragraph',
        version: 1,
      },
    ])
  })

  it('splits a paragraph with multiple linebreaks into multiple segments, in order', () => {
    const original = paragraph([
      textNode('A'),
      linebreak(),
      textNode('B'),
      linebreak(),
      textNode('C'),
    ])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([textNode('A')]),
      paragraph([textNode('B')]),
      paragraph([textNode('C')]),
    ])
  })

  it('produces an empty-children segment for consecutive linebreaks', () => {
    const original = paragraph([textNode('A'), linebreak(), linebreak(), textNode('B')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([textNode('A')]),
      paragraph([]),
      paragraph([textNode('B')]),
    ])
  })

  it('produces an empty-children segment for a leading linebreak', () => {
    const original = paragraph([linebreak(), textNode('A')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([paragraph([]), paragraph([textNode('A')])])
  })

  it('produces an empty-children segment for a trailing linebreak', () => {
    const original = paragraph([textNode('A'), linebreak()])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([paragraph([textNode('A')]), paragraph([])])
  })

  it('splits a paragraph with only linebreak children into all-empty segments', () => {
    const original = paragraph([linebreak(), linebreak()])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([paragraph([]), paragraph([]), paragraph([])])
  })

  it('leaves a nested linebreak inside a link untouched while still splitting on a real top-level linebreak', () => {
    const linkWithNestedLinebreak = {
      ...link('Read more'),
      children: [textNode('Read'), linebreak(), textNode('more')],
    }
    const original = paragraph([linkWithNestedLinebreak, linebreak(), textNode('After')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([linkWithNestedLinebreak]),
      paragraph([textNode('After')]),
    ])
  })

  it('reproduces post 268 DE\'s real shape: text, linebreak, text, link', () => {
    const original = paragraph([
      textNode(
        'Christian Poltéra wird diesen Sonntag beim Beethovenfest Bonn mit dem Orchester Le Concert Olympique unter der Leitung von Jan Caeyers spielen.'
      ),
      linebreak(),
      textNode('Das Konzert wird live übertragen auf dem YouTube-Kanal DW Classical Music und ist online zu finden unter '),
      link('beethovenfest.de/streams'),
    ])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([
        textNode(
          'Christian Poltéra wird diesen Sonntag beim Beethovenfest Bonn mit dem Orchester Le Concert Olympique unter der Leitung von Jan Caeyers spielen.'
        ),
      ]),
      paragraph([
        textNode('Das Konzert wird live übertragen auf dem YouTube-Kanal DW Classical Music und ist online zu finden unter '),
        link('beethovenfest.de/streams'),
      ]),
    ])
  })

  it('passes through a paragraph whose children field is not an array', () => {
    const malformed = { type: 'paragraph', children: 'not-an-array', version: 1 }
    expect(splitParagraphsAtLinebreaks([malformed])).toEqual([malformed])
  })

  it('passes through a paragraph with a missing children field', () => {
    const malformed = { type: 'paragraph', version: 1 }
    expect(splitParagraphsAtLinebreaks([malformed])).toEqual([malformed])
  })

  it('passes through malformed top-level array items without throwing', () => {
    expect(splitParagraphsAtLinebreaks([null, 'not-a-node', 42, {}])).toEqual([null, 'not-a-node', 42, {}])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/features/formatContent/formatContent.spec.ts`
Expected: FAIL — `splitParagraphsAtLinebreaks` is not exported from `./formatContent` (import/type
error, or `undefined is not a function` at runtime).

- [ ] **Step 3: Write the implementation**

In `src/features/formatContent/formatContent.ts`, add the new function after `isEmptyParagraph`
(after line 61, before the existing `formatContentRoot` function):

```typescript

/**
 * Splits a paragraph's direct children into segments at each direct-child `linebreak` node,
 * discarding the linebreak nodes themselves. Only linebreaks that are direct children of the
 * paragraph are split on — a linebreak nested inside an inline span or link (e.g. inside a
 * `link` node's own `children`) is left untouched, because this function only inspects one level
 * of children, never descendants.
 *
 * Each returned segment is a new paragraph object carrying forward every other field from the
 * original (via object spread) — `direction`, `format`, `indent`, `version`, `textFormat`,
 * `textStyle`, and anything else present on the source object. `format` here is the
 * paragraph-level alignment string (e.g. `'start'`), distinct from the numeric per-text-node
 * `format` bitmask nested inside `children` items — the spread only touches the former.
 *
 * If `paragraph.children` is not an array, or the item is not a paragraph node at all (including
 * `null`, primitives, or objects missing `type`), the item is returned unchanged. This function
 * must never throw on malformed input, since it also runs (via a mirrored live implementation) on
 * every Format button click in the admin editor.
 */
function splitParagraph(paragraph: FormatNode): unknown[] {
  const { children } = paragraph
  if (!Array.isArray(children)) return [paragraph]
  if (!children.some((child) => isNode(child) && child.type === 'linebreak')) return [paragraph]

  const segments: unknown[][] = [[]]
  for (const child of children) {
    if (isNode(child) && child.type === 'linebreak') {
      segments.push([])
    } else {
      segments[segments.length - 1].push(child)
    }
  }

  return segments.map((segmentChildren) => ({ ...paragraph, children: segmentChildren }))
}

/**
 * Splits every paragraph in a root children array that contains a direct-child `linebreak` node
 * into multiple sibling paragraphs — one per line. Non-paragraph items (blocks, headings) and
 * paragraphs without a direct-child linebreak pass through unchanged, at the same array position
 * (as a single-item pass-through, not reallocated).
 */
export function splitParagraphsAtLinebreaks(children: unknown[]): unknown[] {
  const result: unknown[] = []
  for (const child of children) {
    if (!isNode(child) || child.type !== 'paragraph') {
      result.push(child)
      continue
    }
    result.push(...splitParagraph(child))
  }
  return result
}
```

Then update `formatContentRoot` to compose both steps (replace the existing function body):

```typescript
export function formatContentRoot(children: unknown[]): unknown[] {
  return splitParagraphsAtLinebreaks(children).filter((child) => !isEmptyParagraph(child))
}
```

Finally, extend the module's top-of-file doc-comment (replace the existing comment at the top of
the file):

```typescript
/**
 * Pure, editor-independent helpers for the FormatContent feature.
 *
 * Operates on the serialized Lexical node shape (same style as the post-content
 * validator in `src/validators/postContent.ts`) so the transform logic can be
 * unit-tested without a live Lexical editor.
 *
 * IMPORTANT: keep these semantics in sync with the live-node mirror in
 * `src/features/formatContent/feature.client.tsx` (the plugin):
 * 1. "Empty paragraph" detection — both must agree that a paragraph is empty only when every
 *    descendant is a `text`, `linebreak`, or `tab` node with whitespace-only content. Any other
 *    node type (e.g. a future inline decorator) must make the paragraph non-empty so Format
 *    never deletes non-text content.
 * 2. "Linebreak split" scoping — both must split only on `linebreak` nodes that are direct
 *    children of a paragraph, never nested descendants (e.g. inside a link's own children).
 * 3. "Linebreak split" attribute preservation — both must copy every paragraph-level attribute
 *    (`direction`, `format`, `indent`, `textFormat`, `textStyle`) from the original paragraph onto
 *    every new split segment.
 */
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/features/formatContent/formatContent.spec.ts`
Expected: PASS — all existing tests plus every new test in the `splitParagraphsAtLinebreaks`
block.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/formatContent/formatContent.ts src/features/formatContent/formatContent.spec.ts
git commit -m "feat: split paragraphs at linebreaks in FormatContent"
```

---

### Task 2: Composed `formatContentRoot` tests

**Files:**
- Test: `src/features/formatContent/formatContent.spec.ts` (already modified in Task 1; this task
  only adds more tests to the existing `describe('formatContentRoot', ...)` block)

This task verifies `formatContentRoot`'s composition of split-then-filter end-to-end, since Task
1's tests only cover `splitParagraphsAtLinebreaks` in isolation.

- [ ] **Step 1: Write the failing tests**

Add these test cases inside the existing `describe('formatContentRoot', ...)` block in
`src/features/formatContent/formatContent.spec.ts`, right before its closing `})` (after the
existing `'does not mutate the input array'` test):

```typescript

  it('splits a paragraph with a linebreak into two paragraphs', () => {
    const original = paragraph([textNode('First'), linebreak(), textNode('Second')])
    expect(formatContentRoot([original])).toEqual([paragraph([textNode('First')]), paragraph([textNode('Second')])])
  })

  it('removes an empty segment produced by splitting a leading linebreak', () => {
    const original = paragraph([linebreak(), textNode('Second')])
    expect(formatContentRoot([original])).toEqual([paragraph([textNode('Second')])])
  })

  it('removes all segments when a paragraph contains only linebreaks', () => {
    const original = paragraph([linebreak(), linebreak()])
    expect(formatContentRoot([original])).toEqual([])
  })

  it('splits then removes empties in a single composed call with mixed content', () => {
    const block = { type: 'block', version: 1 }
    const withLinebreak = paragraph([textNode('A'), linebreak(), linebreak(), textNode('B')])
    const untouched = paragraph([textNode('C')])
    expect(formatContentRoot([block, withLinebreak, text(''), untouched])).toEqual([
      block,
      paragraph([textNode('A')]),
      paragraph([textNode('B')]),
      untouched,
    ])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/features/formatContent/formatContent.spec.ts`
Expected: FAIL if Task 1's implementation is somehow incomplete for these cases; otherwise these
should already PASS immediately since Task 1 already updated `formatContentRoot`. If they pass
immediately, that's expected (Task 1's implementation already covers this) — proceed to Step 3
regardless to confirm.

- [ ] **Step 3: Confirm all tests pass**

Run: `pnpm exec vitest run src/features/formatContent/formatContent.spec.ts`
Expected: PASS — every test in the file, including these four new ones.

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/formatContent/formatContent.spec.ts
git commit -m "test: cover formatContentRoot's composed split-then-filter behavior"
```

---

### Task 3: Live Lexical plugin — split paragraphs at linebreaks

**Files:**
- Modify: `src/features/formatContent/feature.client.tsx`

There is no automated test harness for this live plugin today (confirmed: zero existing test file
for `feature.client.tsx`, and the spec explicitly scopes adding one as out-of-scope). This task is
implementation-only, verified by typecheck/lint and a manual smoke check in Task 4.

- [ ] **Step 1: Add the required Lexical imports**

In `src/features/formatContent/feature.client.tsx`, update the import block at the top of the file
(replace the existing `@payloadcms/richtext-lexical/lexical` import):

```typescript
import {
  $createParagraphNode,
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTabNode,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalNode,
  type ParagraphNode,
} from '@payloadcms/richtext-lexical/lexical'
```

- [ ] **Step 2: Add `splitParagraphsAtLinebreaksLive`**

Add this function after `isRemoveableEmptyParagraph` (after line 46, before `FormatContentPlugin`):

```typescript

/**
 * Live-node mirror of `splitParagraphsAtLinebreaks` in `formatContent.ts`. Splits every top-level
 * paragraph containing a direct-child `LineBreakNode` into multiple sibling paragraphs — one per
 * line — discarding the linebreak nodes. Only direct children are inspected; a linebreak nested
 * inside a link or other inline span is left untouched.
 *
 * Mutates `root` directly. Must run to completion before `root.getChildren()` is read again for
 * the empty-paragraph-removal step in `formatDocument`, since that step's "never delete
 * everything" guard depends on the post-split paragraph count.
 */
function splitParagraphsAtLinebreaksLive(root: ReturnType<typeof $getRoot>): void {
  for (const topLevelChild of root.getChildren()) {
    if (!$isParagraphNode(topLevelChild)) continue

    const children = topLevelChild.getChildren()
    if (!children.some($isLineBreakNode)) continue

    const segments: LexicalNode[][] = [[]]
    for (const child of children) {
      if ($isLineBreakNode(child)) {
        segments.push([])
      } else {
        segments[segments.length - 1].push(child)
      }
    }

    const newParagraphs = segments.map((segmentChildren) => {
      const newParagraph: ParagraphNode = $createParagraphNode()
      newParagraph.setFormat(topLevelChild.getFormatType())
      newParagraph.setIndent(topLevelChild.getIndent())
      newParagraph.setDirection(topLevelChild.getDirection())
      newParagraph.setTextFormat(topLevelChild.getTextFormat())
      newParagraph.setTextStyle(topLevelChild.getTextStyle())
      for (const segmentChild of segmentChildren) {
        newParagraph.append(segmentChild)
      }
      return newParagraph
    })

    // Insert each new paragraph after the previously-inserted one (starting from the original),
    // preserving segment order. Inserting all of them after `topLevelChild` directly would reverse
    // the order.
    let previous: LexicalNode = topLevelChild
    for (const newParagraph of newParagraphs) {
      previous.insertAfter(newParagraph)
      previous = newParagraph
    }

    topLevelChild.remove()
  }
}
```

- [ ] **Step 3: Wire it into `formatDocument`**

Update `formatDocument` inside `FormatContentPlugin` (replace the existing function body):

```typescript
    const formatDocument = (): boolean => {
      editor.update(() => {
        const root = $getRoot()
        splitParagraphsAtLinebreaksLive(root)
        const children = root.getChildren()
        const toRemove = children.filter(isRemoveableEmptyParagraph)
        // Never reduce the document to zero children (content is required).
        if (toRemove.length === children.length) return
        for (const child of toRemove) child.remove()
      })
      return true
    }
```

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors. If `ParagraphNode`, `setTextFormat`, or `setTextStyle` are not found on the
type, check the actual exported type name in
`node_modules/@payloadcms/richtext-lexical/dist/lexical-proxy/lexical.d.ts` (it re-exports
`lexical` verbatim via `export * from 'lexical'`) and adjust the import/type name accordingly —
do not change the underlying Lexical API version.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `pnpm test`
Expected: all tests pass, including the untouched `feature.server.spec.ts` and every test added in
Tasks 1–2.

- [ ] **Step 6: Commit**

```bash
git add src/features/formatContent/feature.client.tsx
git commit -m "feat: mirror linebreak-splitting in the live FormatContent plugin"
```

---

### Task 4: Manual verification against real post 268 content

**Files:** none (verification only, no commit)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Open post 268 (DE locale) in the admin**

Navigate to `/admin/collections/posts`, open "Christian Poltéra beim Beethovenfest" (post 268),
switch to the DE locale tab if not already selected.

- [ ] **Step 3: Trigger Format**

Click the wand icon in the rich-text toolbar (or use the slash-menu `/format` command) on the
`content` field.

- [ ] **Step 4: Confirm the split**

Confirm the single paragraph containing a soft line break before "Das Konzert wird live
übertragen..." is now two separate paragraphs, matching the EN locale's manually-corrected
structure (verified earlier in this session via the Local API). Confirm the link
(`beethovenfest.de/streams`) and the final paragraph (the "13. September 2026, Bonn" link) are
unaffected.

- [ ] **Step 5: Confirm undo works as one step**

Press `Ctrl+Z`/`Cmd+Z` once. Confirm the document reverts to its original single-paragraph state
in one undo step (not two).

- [ ] **Step 6: Do not save**

Do not click Save/Publish — this is a read-only manual check against real content. Navigate away
without saving, or reload the page to discard the change.

- [ ] **Step 7: Stop the dev server**

Stop the `pnpm dev` process (per repo policy: clean up dev servers you start for testing).

- [ ] **Step 8: No commit for this task** — verification only, nothing to stage.

---

## Post-Implementation Notes

- No schema/migration changes were needed or made — this feature is entirely client + shared
  pure-function code with no persisted field changes.
- The live plugin (`feature.client.tsx`) has no automated test coverage, consistent with its
  pre-existing state before this change (per the design spec's explicitly accepted Known
  Limitation).
- Known Limitation (documented in the spec, not fixed here): linebreaks nested inside inline spans
  or links are never split, in either implementation. Verified zero occurrences across current
  production content (255 posts, DE locale) as of the design phase.
</content>
