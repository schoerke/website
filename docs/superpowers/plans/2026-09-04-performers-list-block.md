# PerformersList Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a localized `performersList` Lexical block for structured performers and ensemble groups in Posts and Repertoire.

**Architecture:** Create Payload block config with flat discriminated `items`, then build defensive semantic renderer and wire it into both collection editors plus `PayloadRichText`. Block data stays in existing localized richText JSON; no database migration or generated Payload types required.

**Tech Stack:** Payload CMS 3, Lexical (`@payloadcms/richtext-lexical`), Next.js App Router, React, Tailwind, Vitest, Testing Library, oxlint.

**Spec:** `docs/superpowers/specs/2026-09-04-performers-list-design.md`

**Deferred Firefox issue:** Firefox can move focus from a newly inserted block field back to the parent
Lexical editor (Payload upstream issue #17468). Safari passed. Do not change this plan to a custom
drawer workflow now. If Firefox support becomes required, add a follow-up using Payload's
`admin.components.Block` API; this affects only PerformersList admin editing, not saved block data or
frontend rendering.

---

## File Structure

| File                                            | Action | Responsibility                                                |
| ----------------------------------------------- | ------ | ------------------------------------------------------------- |
| `src/blocks/PerformersList.ts`                  | Create | Block config, exported persisted-shape types, trim validators |
| `src/blocks/PerformersList.spec.ts`             | Create | Config and composed validator tests                           |
| `src/components/blocks/PerformersList.tsx`      | Create | Defensive semantic list renderer                              |
| `src/components/blocks/PerformersList.spec.tsx` | Create | Renderer behavior/accessibility tests                         |
| `src/components/ui/PayloadRichText.tsx`         | Modify | Import and register `performersList` converter                |
| `src/components/ui/PayloadRichText.spec.tsx`    | Modify | Assert real flat block JSON renders                           |
| `src/collections/Posts.ts`                      | Modify | Import/register `PerformersList` in `BlocksFeature`           |
| `src/collections/Repertoire.ts`                 | Modify | Import/register block and update editor description           |
| `src/collections/Posts.test.ts`                 | Modify | Assert Posts editor contains block                            |

### Task 1: Block config and field types

**Files:**

- Create: `src/blocks/PerformersList.ts`
- Create: `src/blocks/PerformersList.spec.ts`

- [ ] **Step 1: Write failing tests**

Create tests for exported `validateRequiredText` calling Payload defaults: whitespace-only name rejects, non-empty accepts, and block config has `slug: 'performersList'`, `items.required`, `items.minRows === 1`, and `members.minRows === 1`.

```ts
it('rejects whitespace-only required text', () => {
  expect(validateRequiredText('   ', { required: true } as never)).toBe('Value is required')
})
```

- [ ] **Step 2: Verify red**

Run: `pnpm vitest run src/blocks/PerformersList.spec.ts`

Expected: FAIL — module/export missing.

- [ ] **Step 3: Implement block config**

Create types matching saved flat BlocksField rows and validator composition:

```ts
import type { Block } from 'payload'
import { text } from 'payload/shared'

export interface PerformerItem {
  id?: string
  blockType: 'performer'
  name: string
  instrument?: string | null
}
export interface EnsembleGroupItem {
  id?: string
  blockType: 'ensembleGroup'
  groupName: string
  members?: { id?: string; name: string; instrument?: string | null }[] | null
}
export interface PerformersListBlockFields {
  title?: string | null
  items?: (PerformerItem | EnsembleGroupItem)[] | null
}

export const validateRequiredText = (value: unknown, args: Parameters<typeof text>[1]): string | true => {
  const result = text(value, args)
  if (result !== true) return result
  return typeof value === 'string' && value.trim() ? true : 'Value is required'
}
```

Define `PerformersList` with bilingual block/field labels, `admin: { disableBlockName: true }`, optional title, `items` as blocks (`performer`, `ensembleGroup`), and required/minRows fields. Do not add custom validators to `items` or `members`.

- [ ] **Step 4: Verify green**

Run: `pnpm vitest run src/blocks/PerformersList.spec.ts`

Expected: PASS.

### Task 2: Semantic defensive renderer

**Files:**

- Create: `src/components/blocks/PerformersList.spec.tsx`
- Create: `src/components/blocks/PerformersList.tsx`

- [ ] **Step 1: Write failing component tests**

Cover: null output for invalid items; trimmed title yellow accent + `h3`; flat performer; blank instrument omitted; group with members; `<ul>/<li>` hierarchy with `list-none`; no valid members produces no nested list; long-content class contract.

```tsx
it('renders a marker-free nested semantic list', () => {
  render(<PerformersList items={[groupFixture]} />)
  expect(screen.getAllByRole('list')).toHaveLength(2)
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getAllByRole('list')[0]).toHaveClass('list-none')
})
```

- [ ] **Step 2: Verify red**

Run: `pnpm vitest run src/components/blocks/PerformersList.spec.tsx`

Expected: FAIL — component missing.

- [ ] **Step 3: Implement minimal renderer**

Use type guards. Trim only narrowed strings. Filter invalid items/members. Use `id ?? \`item-${index}\`` / `id ?? \`member-${index}\``only as defensive fallback. Return`null` if no valid top-level item remains. Use this title markup:

```tsx
<div className="mb-2 flex items-center gap-3">
  <span aria-hidden="true" className="bg-primary-yellow h-0.5 w-6 shrink-0" />
  <h3 className="text-primary-black text-base font-semibold">{titleText}</h3>
</div>
```

Use outer `ul` class `m-0 flex list-none flex-col gap-1.5 p-0`; group nested `ul` class `m-0 flex list-none flex-col gap-1 pl-4 p-0`; performer row class `flex min-w-0 flex-wrap gap-x-2 gap-y-0`; text span classes exactly `break-words font-semibold` and `break-words text-gray-500`.

- [ ] **Step 4: Verify green**

Run: `pnpm vitest run src/components/blocks/PerformersList.spec.tsx`

Expected: PASS.

### Task 3: Register editor blocks and frontend converter

**Files:**

- Modify: `src/collections/Posts.ts`
- Modify: `src/collections/Repertoire.ts`
- Modify: `src/components/ui/PayloadRichText.tsx`
- Modify: `src/components/ui/PayloadRichText.spec.tsx`
- Modify: `src/collections/Posts.test.ts`

- [ ] **Step 1: Write failing registration tests**

Add a Posts config assertion that its BlocksFeature includes `PerformersList`. Add a `PayloadRichText` fixture with:

```ts
{
  type: 'block', version: 2,
  fields: {
    id: 'block-1', blockType: 'performersList', blockName: '',
    items: [{ id: 'row-1', blockType: 'performer', name: 'Tianwa Yang', instrument: 'Violine' }],
  },
}
```

Assert both strings render.

- [ ] **Step 2: Verify red**

Run: `pnpm vitest run src/collections/Posts.test.ts src/components/ui/PayloadRichText.spec.tsx`

Expected: FAIL — `performersList` absent.

- [ ] **Step 3: Wire production files**

Import `PerformersList` in Posts/Repertoire and add it to each `BlocksFeature` array. In Repertoire replace description with exact spec copy. Import renderer/type in `PayloadRichText.tsx` and add:

```tsx
performersList: ({ node }: { node: SerializedLexicalNode & { fields: PerformersListBlockFields } }) => (
  <PerformersList {...node.fields} />
),
```

- [ ] **Step 4: Verify green**

Run: `pnpm vitest run src/collections/Posts.test.ts src/components/ui/PayloadRichText.spec.tsx`

Expected: PASS.

### Task 4: Final verification

- [ ] **Step 1: Run targeted tests**

Run: `pnpm vitest run src/blocks/PerformersList.spec.ts src/components/blocks/PerformersList.spec.tsx src/components/ui/PayloadRichText.spec.tsx src/collections/Posts.test.ts`

Expected: PASS.

- [ ] **Step 2: Run project verification**

Run: `pnpm lint && pnpm test && pnpm typecheck && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 3: Inspect diff**

Run: `git diff --check && git diff -- src/blocks/PerformersList.ts src/components/blocks/PerformersList.tsx src/collections/Posts.ts src/collections/Repertoire.ts src/components/ui/PayloadRichText.tsx`

Expected: no whitespace errors; only specified changes.

- [ ] **Step 4: Request user testing/commit approval**

Do not stage or commit without explicit user approval.
