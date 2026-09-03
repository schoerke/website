# EventDates Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert selected Posts rich-text event lines into an existing `eventDates` block after editor review.

**Architecture:** Add a pure parser and URL guard first. Add a paired Payload Lexical feature: server provider exposes a project-local client provider through the import map; client plugin validates/extracts selection, opens a transient drawer, rechecks a snapshot, then replaces source with a Payload block node in one editor transaction. Scope supports paragraph siblings and every Shift+Enter line in one paragraph, never lists or partial paragraphs.

**Tech Stack:** Payload CMS 3.88, `@payloadcms/richtext-lexical`, Lexical, React 19, TypeScript, Vitest, Testing Library.

---

## File Structure

| File                                                                   | Responsibility                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/features/eventDatesConverter/parser.ts`                           | Pure date/text/URL parsing and row validation.                                      |
| `src/features/eventDatesConverter/parser.spec.ts`                      | Parser matrix.                                                                      |
| `src/features/eventDatesConverter/selection.ts`                        | Pure Lexical selection extraction, eligibility, snapshots, and replacement helpers. |
| `src/features/eventDatesConverter/selection.spec.ts`                   | Lexical state selection/replacement tests.                                          |
| `src/features/eventDatesConverter/feature.server.ts`                   | `createServerFeature` provider.                                                     |
| `src/features/eventDatesConverter/feature.client.tsx`                  | `createClientFeature`, inline formatting-utilities dropdown, editor plugin.         |
| `src/features/eventDatesConverter/EventDatesConversionDrawer.tsx`      | Transient editor review drawer.                                                     |
| `src/features/eventDatesConverter/EventDatesConversionDrawer.spec.tsx` | Drawer behavior tests.                                                              |
| `src/features/eventDatesConverter/EventDatesConversionPlugin.spec.tsx` | Feature/form/history integration tests.                                             |
| `src/collections/Posts.ts`                                             | Register converter immediately before `BlocksFeature`.                              |
| `src/app/(payload)/admin/importMap.js`                                 | Generated client-feature import map. Do not hand-edit.                              |

### Task 1: Parse and Validate Event Lines

**Files:**

- Create: `src/features/eventDatesConverter/parser.ts`
- Create: `src/features/eventDatesConverter/parser.spec.ts`

- [ ] **Step 1: Write failing parser tests**

```ts
import { describe, expect, it } from 'vitest'

import { parseEventDateLine, validateEventUrl } from './parser'

describe('parseEventDateLine', () => {
  it('parses post 262 German numeric event text', () => {
    expect(parseEventDateLine('29.5.2026 19.30 Uhr mit dem Mozarteumorchester Salzburg')).toEqual({
      date: '2026-05-29T12:00:00.000Z',
      location: '19.30 Uhr mit dem Mozarteumorchester Salzburg',
      url: undefined,
    })
  })

  it('parses German and English month names and ISO dates', () => {
    expect(parseEventDateLine('4. Juli 2026, Yamagata')).toMatchObject({ date: '2026-07-04T12:00:00.000Z' })
    expect(parseEventDateLine('July 4, 2026 - Yamagata')).toMatchObject({ date: '2026-07-04T12:00:00.000Z' })
    expect(parseEventDateLine('2026-07-04 Yamagata')).toMatchObject({ date: '2026-07-04T12:00:00.000Z' })
  })

  it('rejects ambiguous and incomplete dates', () => {
    expect(parseEventDateLine('03/04/2026 Yamagata')).toMatchObject({ error: expect.any(String) })
    expect(parseEventDateLine('4. Juli Yamagata')).toMatchObject({ error: expect.any(String) })
    expect(parseEventDateLine('4.-5. Juli 2026 Yamagata')).toMatchObject({ error: expect.any(String) })
  })
})

describe('validateEventUrl', () => {
  it.each(['javascript:alert(1)', 'data:text/html,x', '//example.com', 'https://user:pass@example.com'])(
    'rejects unsafe URL %s',
    (url) => expect(validateEventUrl(url)).toMatchObject({ error: expect.any(String) })
  )
})
```

- [ ] **Step 2: Run parser tests**

Run: `pnpm vitest run src/features/eventDatesConverter/parser.spec.ts`

Expected: FAIL. Module does not exist.

- [ ] **Step 3: Implement parser with explicit grammar**

```ts
export interface ParsedEventDateLine {
  date?: string
  error?: string
  location?: string
  url?: string
}

const months: Record<string, number> = {
  januar: 1,
  january: 1,
  jan: 1,
  februar: 2,
  february: 2,
  feb: 2,
  maerz: 3,
  marz: 3,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mai: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  december: 12,
  dec: 12,
}

export function validateEventUrl(value: string | undefined): { error?: string; url?: string } {
  if (!value?.trim()) return {}
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return { error: 'URL must be an HTTP(S) URL without credentials' }
    }
    return { url: url.toString() }
  } catch {
    return { error: 'Please enter a valid URL' }
  }
}
```

Implement numeric, ISO, and month-name regex branches. Use `String.prototype.normalize('NFKD')`, lower case, and remove combining marks only for month lookup. Validate calendar values with `new Date(Date.UTC(year, month - 1, day))` and compare UTC parts. Never pass source text to `new Date`. Remove only leading `,`, `-`, and whitespace from remainder. Return an error when remainder is empty.

- [ ] **Step 4: Expand test matrix and pass**

Add leap-year, invalid calendar date, Unicode `März`, abbreviations, punctuation, custom URL trimming, no URL, and empty location cases.

Run: `pnpm vitest run src/features/eventDatesConverter/parser.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit parser unit**

```bash
git add src/features/eventDatesConverter/parser.ts src/features/eventDatesConverter/parser.spec.ts
git commit -m "feat(editor): parse EventDates conversion lines"
```

### Task 2: Extract Eligible Lexical Sources

**Files:**

- Create: `src/features/eventDatesConverter/selection.ts`
- Create: `src/features/eventDatesConverter/selection.spec.ts`

- [ ] **Step 1: Write failing selection tests**

Build Lexical test states with `$createParagraphNode`, `$createTextNode`, `$createLineBreakNode`, and Payload custom `LinkNode`. Assert `getEventDateSources()` accepts complete adjacent paragraphs and a complete linebreak paragraph, but rejects lists, partial text ranges, partial linebreak paragraphs, decorators, auto-links, nested links, multiple links, and mixed nodes.

```ts
expect(getEventDateSources(editor)).toEqual({
  sources: [
    { key: 'a', text: '29.5.2026 A', url: 'https://example.com/a' },
    { key: 'b', text: '30.5.2026 B', url: undefined },
  ],
})
```

- [ ] **Step 2: Run selection tests**

Run: `pnpm vitest run src/features/eventDatesConverter/selection.spec.ts`

Expected: FAIL. Module does not exist.

- [ ] **Step 3: Implement extraction and snapshot helpers**

Export `getEventDateSources`, `createEventDateSnapshot`, and `matchesEventDateSnapshot`. Source records contain node key, parent key, sibling index, exact text, and normalized link fields. For paragraphs, accept only direct root children selected from first text offset zero through last text end. For one paragraph, require selection of its complete contents, then split all linebreak-delimited lines. A line accepts text nodes plus exactly one direct Payload custom `LinkNode`.

Snapshot stores `editor._key`, `schemaPath`, locale code, ordered sources, and parent key. Do not rely on node keys alone.

- [ ] **Step 4: Run selection tests**

Run: `pnpm vitest run src/features/eventDatesConverter/selection.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit selection unit**

```bash
git add src/features/eventDatesConverter/selection.ts src/features/eventDatesConverter/selection.spec.ts
git commit -m "feat(editor): extract EventDates conversion selections"
```

### Task 3: Build Review Drawer

**Files:**

- Create: `src/features/eventDatesConverter/EventDatesConversionDrawer.tsx`
- Create: `src/features/eventDatesConverter/EventDatesConversionDrawer.spec.tsx`

- [ ] **Step 1: Write failing drawer tests**

Render drawer with parsed and rejected rows. Assert source text, editable date/location/URL fields, parse errors, trimmed validation, disabled confirm for invalid rows, callback payload, and cancel callback.

- [ ] **Step 2: Run drawer tests**

Run: `pnpm vitest run src/features/eventDatesConverter/EventDatesConversionDrawer.spec.tsx`

Expected: FAIL. Module does not exist.

- [ ] **Step 3: Implement controlled transient drawer**

Use Payload UI `Drawer`, `Button`, and native controlled inputs matching existing admin UI styles. Keep form state inside component. On every edit, call `parseEventDateLine` only when re-parsing source is requested; otherwise validate entered date as canonical noon UTC, location after trim, and URL through `validateEventUrl`. Confirm emits `EventDatesBlockFields['events']` only when every row passes. It never calls Lexical APIs.

- [ ] **Step 4: Run drawer tests**

Run: `pnpm vitest run src/features/eventDatesConverter/EventDatesConversionDrawer.spec.tsx`

Expected: PASS.

- [ ] **Step 5: Commit drawer unit**

```bash
git add src/features/eventDatesConverter/EventDatesConversionDrawer.tsx src/features/eventDatesConverter/EventDatesConversionDrawer.spec.tsx
git commit -m "feat(editor): add EventDates conversion review drawer"
```

### Task 4: Register Payload Feature and Replace Source

**Files:**

- Create: `src/features/eventDatesConverter/feature.server.ts`
- Create: `src/features/eventDatesConverter/feature.client.tsx`
- Create: `src/features/eventDatesConverter/EventDatesConversionPlugin.spec.tsx`
- Modify: `src/collections/Posts.ts:5,129-139`
- Modify: `src/app/(payload)/admin/importMap.js` (generated)

- [ ] **Step 1: Write failing integration tests**

Test client plugin with a Lexical editor and Payload field harness. Assert formatting-utilities dropdown action enables for any non-empty range, invalid source selection reports feedback without opening the drawer, cancel leaves state unchanged, confirm emits one block node, undo restores exact source nodes and redo restores block, and a changed snapshot produces `Selection changed` without mutation.

Assert exact serialized block shape:

```ts
expect(serialized.root.children[0]).toMatchObject({
  type: 'block',
  version: 2,
  fields: {
    blockType: 'eventDates',
    blockName: '',
    events: [{ date: '2026-05-29T12:00:00.000Z', location: '19.30 Uhr ...' }],
  },
})
expect(serialized.root.children[0].fields.id).toEqual(expect.any(String))
```

- [ ] **Step 2: Run integration tests**

Run: `pnpm vitest run src/features/eventDatesConverter/EventDatesConversionPlugin.spec.tsx`

Expected: FAIL. Feature modules do not exist.

- [ ] **Step 3: Implement paired feature providers**

In `feature.server.ts`, export:

```ts
import { createServerFeature } from '@payloadcms/richtext-lexical'

export const EventDatesConversionFeature = createServerFeature({
  key: 'eventDatesConversion',
  // Payload 3.88 reverses priority-dependency traversal; register immediately before BlocksFeature instead.
  feature: {
    ClientFeature: '@/features/eventDatesConverter/feature.client#EventDatesConversionFeatureClient',
  },
})
```

In `feature.client.tsx`, export `EventDatesConversionFeatureClient = createClientFeature(...)`. Add a normal-position plugin that owns editor state and drawer visibility. Add a gear-icon `Formatting utilities` dropdown group to the inline toolbar, leaving it extensible for future utilities. Enable `Convert to Event Dates` for any non-empty range. On action, validate selection before creating source snapshot; show its error without opening the drawer when invalid. On confirm, run one `editor.update()` that rechecks snapshot then uses Payload `$createBlockNode({ blockType: 'eventDates', blockName: '', events })`, inserts at first source position, and removes every source only after block insertion is ready.

Do not attempt list conversion. Do not use REST or database APIs.

- [ ] **Step 4: Register converter immediately before BlocksFeature**

Modify `src/collections/Posts.ts`:

```ts
EventDatesConversionFeature(),
BlocksFeature({ blocks: [VideoEmbed, AudioEmbed, EventDates] }),
TextStateFeature({ state: postTextState }),
```

Import `EventDatesConversionFeature` from its server module.

- [ ] **Step 5: Generate import map**

Run: `pnpm generate:importmap`

Expected: `src/app/(payload)/admin/importMap.js` gains `EventDatesConversionFeatureClient`. Inspect generated diff; never manually fabricate import-map hashes.

- [ ] **Step 6: Run integration tests**

Run: `pnpm vitest run src/features/eventDatesConverter/EventDatesConversionPlugin.spec.tsx`

Expected: PASS.

- [ ] **Step 7: Commit feature unit**

```bash
git add src/features/eventDatesConverter src/collections/Posts.ts 'src/app/(payload)/admin/importMap.js'
git commit -m "feat(editor): convert event lines to EventDates blocks"
```

### Task 5: Full Verification and Manual Check

**Files:**

- No code changes expected.

- [ ] **Step 1: Format touched files**

Run: `pnpm exec oxfmt --write src/features/eventDatesConverter src/collections/Posts.ts 'src/app/(payload)/admin/importMap.js'`

- [ ] **Step 2: Run focused suite**

Run: `pnpm vitest run src/features/eventDatesConverter src/blocks/EventDates.spec.ts src/components/blocks/EventDates.spec.tsx`

Expected: PASS.

- [ ] **Step 3: Run project verification**

Run: `pnpm lint && pnpm test && pnpm typecheck && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 4: Manual admin check against local `dev.db`**

Open local admin post 262, DE locale. Select only linked Shift+Enter event lines. Verify drawer parses `29.5.2026` as `2026-05-29T12:00:00.000Z`, preserves URLs, permits corrections, converts to one block, undo/redo works, save/reload renders locale-aware dates. Do not modify production.

- [ ] **Step 5: Commit formatting corrections only if needed**

```bash
git add src/features/eventDatesConverter src/collections/Posts.ts 'src/app/(payload)/admin/importMap.js'
git commit -m "style: format EventDates conversion feature"
```

## Plan Self-Review

- Spec coverage: parser grammar, whole-paragraph source structure, all-or-nothing conversion, custom-link policy, stale snapshot, Payload server/client feature pair, block factory, form/history tests, import map, and post 262 manual check map to Tasks 1-5.
- No placeholders: paths, commands, expected outcomes, and key interfaces included.
- Type consistency: parser emits `EventDatesBlockFields['events']`-compatible canonical values; client feature creates Payload block shape defined in spec.
