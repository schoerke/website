# PerformersList Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert selected Posts rich-text performer lines into one reviewed `performersList` block.

**Architecture:** Reuse EventDates converter selection/snapshot/replacement pattern. Add a pure first-pipe parser plus pure draft nesting/mutation helpers. Client feature opens an accessible review drawer; drawer returns strict final flat block items only after validation and explicit content/link-loss acknowledgement.

**Tech Stack:** Payload CMS 3, Lexical, React, Payload UI, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-performers-list-converter-design.md`

---

## File Structure

| File                                                                           | Action    | Responsibility                                                   |
| ------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------- |
| `src/features/performersListConverter/parser.ts`                               | Create    | Pure first-pipe parser and control/whitespace normalizer         |
| `src/features/performersListConverter/parser.spec.ts`                          | Create    | Parser cases                                                     |
| `src/features/performersListConverter/draft.ts`                                | Create    | Auto-nesting, strict final output, data-preserving mutations     |
| `src/features/performersListConverter/draft.spec.ts`                           | Create    | Nest/delete/move/final-validation cases                          |
| `src/features/performersListConverter/selection.ts`                            | Create    | Source-line extraction, `${paragraphKey}:${lineIndex}` snapshots |
| `src/features/performersListConverter/selection.spec.ts`                       | Create    | Complete-selection, links, Shift+Enter, stale detection          |
| `src/features/performersListConverter/PerformersListConversionDrawer.tsx`      | Create    | Accessible draft review UI                                       |
| `src/features/performersListConverter/PerformersListConversionDrawer.spec.tsx` | Create    | Drawer controls, warnings, focus and confirm gating              |
| `src/features/performersListConverter/feature.server.ts`                       | Create    | Paired server feature key/config                                 |
| `src/features/performersListConverter/feature.client.tsx`                      | Create    | Toolbar plugin, drawer bridge, atomic Lexical replacement        |
| `src/features/performersListConverter/feature.server.spec.ts`                  | Create    | Feature ordering/config assertions                               |
| `src/features/performersListConverter/PerformersListConversionPlugin.spec.tsx` | Create    | Block JSON, undo/redo, source paragraph replacement              |
| `src/collections/Posts.ts`                                                     | Modify    | Register feature with EventDates + BlocksFeature                 |
| `src/collections/Posts.test.ts`                                                | Modify    | Assert both converter keys + PerformersList blocks registration  |
| `src/app/(payload)/admin/importMap.js`                                         | Generated | Register drawer client component after feature added             |

### Task 1: Parser

**Files:** Create `parser.ts`, `parser.spec.ts`

- [ ] **Step 1: Write parser tests**

Cover `Tianwa Yang | Violine`, no-space pipe, remaining pipes, trailing pipe, empty left side, pipe-less group, NBSP trim, whitespace-only reject, and C0/C1 stripping. Expected contract:

```ts
parsePerformersListLine('A | B | C')
// { type: 'performer', name: 'A', instrument: 'B | C' }
parsePerformersListLine('Trio Catch')
// { type: 'ensembleGroup', groupName: 'Trio Catch' }
```

- [ ] **Step 2: Run red**

Run: `pnpm vitest run src/features/performersListConverter/parser.spec.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement parser**

Create discriminated parsed rows. `normalizeDisplayText` strips C0/C1 controls then trims. Split at first `|`; blank right omits instrument; blank left returns invalid performer reason; no pipe returns group.

- [ ] **Step 4: Run green**

Run same command. Expected: PASS.

### Task 2: Draft model and safe mutations

**Files:** Create `draft.ts`, `draft.spec.ts`

- [ ] **Step 1: Write failing draft tests**

Define draft rows carrying `sourceId`, `originalText`, `discardedLinkUrl?`. Test auto-nesting, group boundary, leading performer, member unnest, nest into preceding group, performer-to-group, group-to-performer promotes members, group delete promotes members, and final invalid/empty output rejection.

- [ ] **Step 2: Run red**

Run: `pnpm vitest run src/features/performersListConverter/draft.spec.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement pure draft helpers**

Export strict final shape:

```ts
export type ConvertedItem =
  | { blockType: 'performer'; name: string; instrument?: string }
  | { blockType: 'ensembleGroup'; groupName: string; members: { name: string; instrument?: string }[] }
```

Never discard a group member: group deletion/toggle promotes members in order. `toConvertedItems` strips controls/trims, omits blank instruments, rejects empty final items/groups/members.

- [ ] **Step 4: Run green**

Run same command. Expected: PASS.

### Task 3: Selection, source identity, and snapshot

**Files:** Create `selection.ts`, `selection.spec.ts`

- [ ] **Step 1: Write failing selection tests**

Port EventDates eligibility tests. Assert full root paragraphs only, one complete Shift+Enter paragraph only, direct custom link only, whitespace line rejected, and Shift+Enter sources use one paragraph key but distinct `sourceId`s:

```ts
expect(sources.map(({ sourceId }) => sourceId)).toEqual(['key:0', 'key:1', 'key:2'])
```

Test snapshot rejects source text/reparent/reorder changes but allows active selection to move.

- [ ] **Step 2: Run red**

Run: `pnpm vitest run src/features/performersListConverter/selection.spec.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement selection functions**

Adapt EventDates `getEventDateSources`, `createEventDateSnapshot`, `matchesEventDateSnapshot`. Store immutable raw text/link in snapshot; use normalized text only for drawer display. Source identity is `${paragraph.getKey()}:${lineIndex}`. Later replacement deduplicates source paragraph keys.

- [ ] **Step 4: Run green**

Run same command. Expected: PASS.

### Task 4: Accessible review drawer

**Files:** Create drawer + drawer spec

- [ ] **Step 1: Write failing UI tests**

Cover member edits, Up/Down disabled bounds, add/remove group, delete warning + acknowledgement, link warning + acknowledgement, both acknowledgements required together, invalid group gating, and focus targets: delete → next/previous Name input/drawer heading.

- [ ] **Step 2: Run red**

Run: `pnpm vitest run src/features/performersListConverter/PerformersListConversionDrawer.spec.tsx`

Expected: FAIL — component missing.

- [ ] **Step 3: Implement drawer**

Use native buttons with source-context accessible labels and `aria-describedby` errors. Render discarded URLs as sanitized text only, never links. Confirm disabled unless `toConvertedItems` succeeds, ≥1 item remains, and each applicable acknowledgement checkbox is checked. On confirm return final `ConvertedItem[]`; drawer never mutates Lexical.

- [ ] **Step 4: Run green**

Run same command. Expected: PASS.

### Task 5: Feature registration and atomic conversion

**Files:** Create feature/client/plugin/server tests; modify `Posts.ts`, `Posts.test.ts`

- [ ] **Step 1: Write failing feature tests**

Test feature key/order with `EventDatesConversionFeature`, `PerformersListConversionFeature`, and `BlocksFeature`; assert `blocks` precedes both client plugins. Add plugin test: selected post-116 lines produce exactly:

```ts
{ blockType: 'performersList', blockName: '', items: [
  { blockType: 'performer', name: 'Tianwa Yang', instrument: 'Violine' },
  { blockType: 'ensembleGroup', groupName: 'Trio Catch', members: [
    { name: 'Martin Adámek', instrument: 'Klarinette' },
  ] },
] }
```

Also assert one Undo restores sources, Redo restores block, stale source aborts, and three Shift+Enter lines remove one paragraph with no residual source node.

- [ ] **Step 2: Run red**

Run: `pnpm vitest run src/features/performersListConverter/feature.server.spec.ts src/features/performersListConverter/PerformersListConversionPlugin.spec.tsx`

Expected: FAIL — feature missing.

- [ ] **Step 3: Implement server/client features**

Register client plugin before/with `BlocksFeature`; do not rely on adjacency. Plugin opens drawer after selection snapshot. Before `editor.update`, run `toConvertedItems`. Inside one update: verify snapshot, create `$createBlockNode({ blockType: 'performersList', blockName: '', items })`, insert before first source paragraph, remove each unique source paragraph. Catch unexpected factory/update errors and preserve sources. Register in Posts and generate import map:

```bash
pnpm generate:importmap
```

- [ ] **Step 4: Run green**

Run same command. Expected: PASS.

### Task 6: Full verification

**Files:** All above

- [ ] **Step 1: Run converter tests**

Run: `pnpm vitest run src/features/performersListConverter src/collections/Posts.test.ts`

Expected: PASS.

- [ ] **Step 2: Run safe project checks**

Run: `pnpm lint && pnpm test && pnpm typecheck && pnpm exec oxfmt --check src/features/performersListConverter src/collections/Posts.ts src/collections/Posts.test.ts src/app/(payload)/admin/importMap.js && git diff --check`

Expected: all exit 0.

- [ ] **Step 3: Build approval gate**

Do not run `pnpm build` without explicit approval: it runs `generate:search-index`, which writes local `dev.db` search records. Before asking, show command, target local DB, and affected data.

- [ ] **Step 4: Request user testing and commit approval**

Do not stage or commit without explicit user approval.
