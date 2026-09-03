# Post Content Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn editors immediately about invalid Posts content, permit invalid draft saves, and prevent invalid publishing.

**Architecture:** A client-safe validator returns stable structural error IDs from Lexical JSON. A Posts-only rich-text field wrapper maps IDs to localized advisory UI. The server validator protects published writes by safely sequencing Payload required validation, shape validation, Lexical node validation, then structural rules.

**Tech Stack:** Payload CMS 3.88, Lexical, React 19, TypeScript, Vitest, Testing Library, SCSS.

---

## File Structure

- Create: `src/validators/postContent.ts` — client-safe structural validation and error IDs.
- Create: `src/validators/postContent.spec.ts` — pure validator coverage.
- Create: `src/components/admin/PostContentField.tsx` — Posts-only `RichTextField` wrapper and Lexical state observer.
- Create: `src/components/admin/PostContentField.scss` — warning border and reserved hint space.
- Create: `src/components/admin/PostContentField.spec.tsx` — wrapper warning class, localized hints, and live updates.
- Modify: `src/collections/Posts.ts:1-223` — register wrapper, compose publish validator, disable draft validation.
- Modify: `src/collections/Posts.test.ts:1-65` — verify configured composed validator and draft option.

### Task 1: Structural Validator

**Files:**
- Create: `src/validators/postContent.ts`
- Create: `src/validators/postContent.spec.ts`

- [ ] **Step 1: Write failing pure-validator tests**

```ts
import { describe, expect, it } from 'vitest'

import { validatePostContent } from './postContent'

const paragraph = (text: string) => ({ type: 'paragraph', children: [{ type: 'text', text }] })
const content = (...children: unknown[]) => ({ root: { children } })

describe('validatePostContent', () => {
  it('accepts text-first content with a non-empty final paragraph', () => {
    expect(validatePostContent(content(paragraph('Opening'), paragraph('Closing')))).toBe(true)
  })

  it('rejects malformed non-empty editor state without throwing', () => {
    expect(validatePostContent({ root: { children: [null] } })).toBe('malformed')
    expect(validatePostContent({ root: { children: ['bad'] } })).toBe('malformed')
  })

  it('rejects a leading block', () => {
    expect(validatePostContent(content({ type: 'block', fields: { blockType: 'eventDates' } }, paragraph('Text')))).toBe(
      'leadingBlock'
    )
  })

  it('rejects an empty first paragraph', () => {
    expect(validatePostContent(content(paragraph('  '), paragraph('Text')))).toBe('emptyFirstLine')
  })

  it('rejects an empty final paragraph', () => {
    expect(validatePostContent(content(paragraph('Text'), paragraph('\n  ')))).toBe('emptyTrailingParagraph')
  })

  it('accepts nested link text and a final block', () => {
    expect(
      validatePostContent(
        content(
          { type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', text: 'Opening' }] }] },
          { type: 'block', fields: { blockType: 'videoEmbed' } }
        )
      )
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests; verify failure**

Run: `pnpm test -- src/validators/postContent.spec.ts`

Expected: FAIL. Module does not exist.

- [ ] **Step 3: Implement validator**

```ts
export type PostContentValidationError = 'malformed' | 'leadingBlock' | 'emptyFirstLine' | 'emptyTrailingParagraph'

interface LexicalNode {
  children?: unknown
  text?: unknown
  type?: unknown
}

function isNode(value: unknown): value is LexicalNode {
  return typeof value === 'object' && value !== null
}

function nodeText(node: LexicalNode): string {
  const text = typeof node.text === 'string' ? node.text : ''
  if (!Array.isArray(node.children)) return text
  return text + node.children.filter(isNode).map(nodeText).join('')
}

export function validatePostContent(value: unknown): true | PostContentValidationError {
  if (typeof value !== 'object' || value === null || !('root' in value) || !isNode(value.root)) return 'malformed'
  if (!Array.isArray(value.root.children) || value.root.children.length === 0) return 'malformed'

  const first = value.root.children[0]
  const last = value.root.children.at(-1)
  if (!isNode(first) || !isNode(last) || typeof first.type !== 'string' || typeof last.type !== 'string') return 'malformed'
  if (first.type === 'block') return 'leadingBlock'
  if (!nodeText(first).trim()) return 'emptyFirstLine'
  if (last.type === 'paragraph' && !nodeText(last).trim()) return 'emptyTrailingParagraph'

  return true
}
```

- [ ] **Step 4: Run tests; verify pass**

Run: `pnpm test -- src/validators/postContent.spec.ts`

Expected: PASS.

- [ ] **Step 5: Format changed files**

Run: `pnpm exec oxfmt --write src/validators/postContent.ts src/validators/postContent.spec.ts`

Expected: successful formatting.

### Task 2: Advisory Rich-Text Field Wrapper

**Files:**
- Create: `src/components/admin/PostContentField.tsx`
- Create: `src/components/admin/PostContentField.scss`
- Create: `src/components/admin/PostContentField.spec.tsx`

- [ ] **Step 1: Write failing wrapper tests**

Mock `RichTextField`, `useLocale`, and `useField` as existing `CreditField.spec.tsx` does. Mock a small child component using `useLexicalComposerContext` that captures `registerUpdateListener` and `getEditorState().read`. Assert:

```ts
expect(screen.getByRole('alert')).toHaveTextContent('Der Beitrag muss mit Text beginnen, nicht mit einem Einbettungsblock.')
expect(screen.getByTestId('rich-text')).toHaveAttribute('data-warning-class', 'post-content-warning')
```

Add cases for English `emptyFirstLine`, German `emptyTrailingParagraph`, initial invalid state, and an update changing invalid to valid removes both `role="alert"` and warning class.

- [ ] **Step 2: Run tests; verify failure**

Run: `pnpm test -- src/components/admin/PostContentField.spec.tsx`

Expected: FAIL. Component does not exist.

- [ ] **Step 3: Implement wrapper and stylesheet**

Use `RichTextField` and `useLocale` from `@payloadcms/ui` / `@payloadcms/richtext-lexical/client`, `useLexicalComposerContext`, and `React.useState` / `React.useEffect`. Preserve `props.field.admin.className` by cloning `field`, matching `CreditField.tsx:16-21`. Create an internal plugin that evaluates `editor.getEditorState().toJSON()` inside `.read()`, evaluates once on mount, then returns `editor.registerUpdateListener(({ editorState }) => ...)`. Map IDs with:

```ts
const messages = {
  de: {
    malformed: 'Der Beitragsinhalt ist ungueltig.',
    leadingBlock: 'Der Beitrag muss mit Text beginnen, nicht mit einem Einbettungsblock.',
    emptyFirstLine: 'Bitte die leere erste Zeile entfernen.',
    emptyTrailingParagraph: 'Bitte den leeren Absatz am Ende entfernen.',
  },
  en: {
    malformed: 'Post content is invalid.',
    leadingBlock: 'Start the post with text, not an embed block.',
    emptyFirstLine: 'Remove the empty first line.',
    emptyTrailingParagraph: 'Remove the empty paragraph at the end.',
  },
} as const
```

Style outer field only:

```scss
.field-type.rich-text-lexical.post-content-warning .editor-container {
  border-color: var(--theme-warning-400);
  box-shadow: 0 0 0 1px var(--theme-warning-400);
}

.post-content-warning-hidden {
  visibility: hidden;
}
```

Render reserved hint space below `<RichTextField>` with `role="alert"` only when an error exists. Import stylesheet in wrapper.

- [ ] **Step 4: Run wrapper tests; verify pass**

Run: `pnpm test -- src/components/admin/PostContentField.spec.tsx`

Expected: PASS.

- [ ] **Step 5: Format changed files**

Run: `pnpm exec oxfmt --write src/components/admin/PostContentField.tsx src/components/admin/PostContentField.scss src/components/admin/PostContentField.spec.tsx`

Expected: successful formatting.

### Task 3: Publish Validator And Posts Registration

**Files:**
- Modify: `src/collections/Posts.ts:1-223`
- Modify: `src/collections/Posts.test.ts:1-65`

- [ ] **Step 1: Write failing configuration tests**

Extract `validatePublishedPostContent` from `Posts.ts`. Add tests proving:

```ts
expect(Posts.versions?.drafts?.validate).toBe(false)
await expect(validatePublishedPostContent(undefined, options)).resolves.toBe('Required')
await expect(validatePublishedPostContent({ root: { children: [null] } }, options)).resolves.toBe('Post content is invalid.')
await expect(validatePublishedPostContent(validLeadingBlock, options)).resolves.toBe('Start the post with text, not an embed block.')
expect(options.editor.validate).not.toHaveBeenCalledWith({ root: { children: [null] } }, options)
```

Use a mocked `options.editor.validate` returning `true` for structural checks and returning `'block node failed to validate: ...'` to prove Lexical error wins before structural rules. Assert the `content` field points to `/components/admin/PostContentField`.

- [ ] **Step 2: Run tests; verify failure**

Run: `pnpm test -- src/collections/Posts.test.ts`

Expected: FAIL. Export and configuration absent.

- [ ] **Step 3: Implement safe server composition**

In `Posts.ts`, import `richText` from `payload` and `validatePostContent` / its error type. Add `postContentMessages` mapping server error IDs to English strings. Export:

```ts
export async function validatePublishedPostContent(value: unknown, options: ValidateOptions<unknown, unknown, RichTextField>): Promise<true | string> {
  const requiredResult = await richText(value, options)
  if (requiredResult !== true && (!value || !value.root?.children?.length)) return requiredResult

  const structureResult = validatePostContent(value)
  if (structureResult === 'malformed') return postContentMessages.malformed

  const lexicalResult = await options.editor.validate(value, options)
  if (lexicalResult !== true) return lexicalResult
  if (structureResult !== true) return postContentMessages[structureResult]
  return true
}
```

Before finalizing, replace the unsafe `value.root` access with a local type guard. Do not invoke `richText` twice for valid values: use Payload required validation only after a `hasRootChildren` guard determines it cannot traverse malformed non-empty data. The required/shape/Lexical/semantic order must be exactly: missing or empty content → `richText`; malformed non-empty content → structural error; well-formed content → `options.editor.validate`; semantic structural error last.

Set `content.admin.components.Field` to `/components/admin/PostContentField`, attach `validate: validatePublishedPostContent`, and change `versions.drafts.validate` to `false`.

- [ ] **Step 4: Run collection tests; verify pass**

Run: `pnpm test -- src/collections/Posts.test.ts`

Expected: PASS.

- [ ] **Step 5: Run focused checks**

Run: `pnpm lint && pnpm typecheck && pnpm test -- src/validators/postContent.spec.ts src/components/admin/PostContentField.spec.tsx src/collections/Posts.test.ts`

Expected: all commands exit 0.

- [ ] **Step 6: Inspect diff**

Run: `git diff --check && git diff -- src/validators/postContent.ts src/validators/postContent.spec.ts src/components/admin/PostContentField.tsx src/components/admin/PostContentField.scss src/components/admin/PostContentField.spec.tsx src/collections/Posts.ts src/collections/Posts.test.ts`

Expected: no whitespace errors; diff contains only planned files.

## Final Verification

- [ ] Run: `pnpm build`

Expected: exits 0. This runs search-index generation, which initializes Payload; do not approve or apply database changes if prompted.

- [ ] Run: `git status --short`

Expected: only plan/spec and intended implementation/test files changed. Do not commit without explicit user approval.
