# Remove Issues Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Issues collection and all associated code from the codebase.

**Architecture:** Pure deletion — remove collection definition, hook, email function, and all associated tests. No migration needed (zero records in DB). Payload will drop the `issues` table on next schema push.

**Tech Stack:** Next.js, Payload CMS, TypeScript, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/collections/Issues.ts` | Delete |
| `src/collections/hooks/sendIssueNotification.ts` | Delete |
| `src/collections/hooks/sendIssueNotification.spec.ts` | Delete |
| `src/payload.config.ts` | Remove `Issues` import + remove from `collections` array |
| `src/services/email.ts` | Remove `SendIssueNotificationEmailParams` interface + `sendIssueNotificationEmail` function (lines ~19-27 and ~115-213) |
| `src/services/email.spec.ts` | Remove `sendIssueNotificationEmail` import + `describe('sendIssueNotificationEmail', ...)` block + issue-related error handling test |
| `src/utils/html.spec.ts` | Remove the `/admin/collections/issues/123` assertion from the relative paths test |

---

## Task 1: Remove collection files and config

**Files:**
- Delete: `src/collections/Issues.ts`
- Delete: `src/collections/hooks/sendIssueNotification.ts`
- Delete: `src/collections/hooks/sendIssueNotification.spec.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Delete the three files**

```bash
rm src/collections/Issues.ts
rm src/collections/hooks/sendIssueNotification.ts
rm src/collections/hooks/sendIssueNotification.spec.ts
```

- [ ] **Step 2: Remove Issues from payload.config.ts**

In `src/payload.config.ts`, remove the import line:

```ts
import { Issues } from './collections/Issues'
```

And remove `Issues` from the `collections` array:

```ts
// Before
collections: [Artists, Employees, Pages, Posts, Recordings, Repertoire, Users, Images, Documents, Issues],

// After
collections: [Artists, Employees, Pages, Posts, Recordings, Repertoire, Users, Images, Documents],
```

- [ ] **Step 3: Run TypeScript check**

```bash
pnpm exec tsc --noEmit
```

Expected: errors about `sendIssueNotificationEmail` still referenced in `email.ts` and `email.spec.ts` — those are fixed in Task 2. If errors are ONLY about those two files, proceed.

- [ ] **Step 4: Run tests to see expected failures**

```bash
pnpm test src/collections/ src/services/email.spec.ts --reporter=verbose 2>&1 | grep -E "FAIL|PASS|error" | head -20
```

Expected: `sendIssueNotification.spec.ts` gone (no longer collected), email spec may fail on missing import.

---

## Task 2: Remove sendIssueNotificationEmail from email service

**Files:**
- Modify: `src/services/email.ts`
- Modify: `src/services/email.spec.ts`

- [ ] **Step 1: Remove SendIssueNotificationEmailParams and sendIssueNotificationEmail from email.ts**

Remove lines 19–27 (the `SendIssueNotificationEmailParams` interface):

```ts
interface SendIssueNotificationEmailParams {
  payload: Payload
  to: string
  title: string
  description: string | object // Lexical JSON data or plain text
  status: string
  reporterName?: string
  reporterEmail?: string
  issueId: string
}
```

Remove the JSDoc block starting around line 110 and the entire `sendIssueNotificationEmail` function (from `export async function sendIssueNotificationEmail` through its closing `}`). This is lines ~110–213 in the current file — the entire second exported function.

After removal, `src/services/email.ts` should export only:
- `ResendResponse` interface
- `sendResetPasswordEmail` function

- [ ] **Step 2: Update email.spec.ts**

In `src/services/email.spec.ts`:

**Remove** `sendIssueNotificationEmail` from the import on line 3:

```ts
// Before
import { sendIssueNotificationEmail, sendResetPasswordEmail, type ResendResponse } from './email'

// After
import { sendResetPasswordEmail, type ResendResponse } from './email'
```

**Remove** the entire `describe('sendIssueNotificationEmail', ...)` block (lines ~71–197).

**Remove** the issue-related test in `describe('error handling', ...)` — the test that calls `sendIssueNotificationEmail` with `to: ''`:

```ts
// Remove this test:
it('should throw error for empty recipient email', async () => {
  await expect(
    sendIssueNotificationEmail({
      payload,
      to: '',
      title: 'Test',
      description: 'Test description',
      status: 'open',
      issueId: 'test',
    })
  ).rejects.toThrow()
})
```

- [ ] **Step 3: Run email service tests**

```bash
pnpm test src/services/email.spec.ts --reporter=verbose
```

Expected: all remaining tests pass (only `sendResetPasswordEmail` tests remain)

- [ ] **Step 4: Run TypeScript check**

```bash
pnpm exec tsc --noEmit
```

Expected: only the `html.spec.ts` issue URL test remaining (cosmetic, not a type error). If clean, proceed.

---

## Task 3: Clean up html.spec.ts

**Files:**
- Modify: `src/utils/html.spec.ts`

- [ ] **Step 1: Remove the issues URL assertion**

In `src/utils/html.spec.ts` around line 70, in the `'should allow relative paths starting with /'` test, remove the issues assertion:

```ts
// Before
it('should allow relative paths starting with /', () => {
  expect(sanitizeUrl('/admin/collections/issues/123')).toBe('/admin/collections/issues/123')
  expect(sanitizeUrl('/api/images/file/screenshot.jpg')).toBe('/api/images/file/screenshot.jpg')
})

// After
it('should allow relative paths starting with /', () => {
  expect(sanitizeUrl('/api/images/file/screenshot.jpg')).toBe('/api/images/file/screenshot.jpg')
})
```

- [ ] **Step 2: Run html utils tests**

```bash
pnpm test src/utils/html.spec.ts --reporter=verbose
```

Expected: all tests pass

---

## Task 4: Full verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test --reporter=verbose
```

Expected: all tests pass, no references to Issues or sendIssueNotification remain

- [ ] **Step 2: Run TypeScript check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: exit 0 (pre-existing `SearchProvider.tsx` warning acceptable)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove Issues collection and associated email notification code"
```
