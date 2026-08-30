# Image Credit Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove leading `(c)` prefixes from existing image credits and warn Payload admins before they add them again.

**Architecture:** A pure utility identifies and normalizes only leading `(c)` markers. A Payload admin field reuses that predicate for a non-blocking warning. A manifest-driven Local API script makes audited, guarded updates; a locked-down admin route invalidates frontend cache after a completed cleanup.

**Tech Stack:** Next.js App Router, Payload CMS 3.88 Local API and admin UI, TypeScript, Vitest, SQLite.

---

## File Structure

- Create `src/utils/imageCredit.ts`: pure prefix predicate and normalizer.
- Create `src/utils/imageCredit.spec.ts`: unit coverage for pure credit behavior.
- Create `src/components/admin/CreditField.tsx`: localized Payload admin warning field.
- Create `src/components/admin/CreditField.scss`: warning border and stable warning-space layout.
- Create `src/components/admin/CreditField.spec.tsx`: component warning coverage.
- Modify `src/collections/Images.ts`: register `CreditField` for `credit`.
- Modify `src/app/(payload)/admin/importMap.js`: generated Payload component registration.
- Create `src/app/api/revalidate-images/route.ts`: admin-only fixed frontend cache purge.
- Create `src/app/api/revalidate-images/route.spec.ts`: endpoint authorization and cache calls.
- Create `scripts/db/cleanImageCredits.ts`: manifest writer and guarded updater.
- Create `src/test/cleanImageCredits.spec.ts`: mocked Local API script behavior.
- Create `src/test/imageCreditCleanup.integration.spec.ts`: disposable SQLite/Payload integration coverage.

### Task 1: Pure Image-Credit Utility

**Files:**
- Create: `src/utils/imageCredit.spec.ts`
- Create: `src/utils/imageCredit.ts`

- [ ] **Step 1: Write failing normalizer tests**

```ts
import { describe, expect, it } from 'vitest'
import { hasLeadingCopyrightMarker, normalizeImageCredit } from './imageCredit'

describe('image credit helpers', () => {
  it('detects a leading case-insensitive marker only', () => {
    expect(hasLeadingCopyrightMarker('(c) Jane Doe')).toBe(true)
    expect(hasLeadingCopyrightMarker('(C)Jane Doe')).toBe(true)
    expect(hasLeadingCopyrightMarker('  (c) Jane Doe')).toBe(false)
    expect(hasLeadingCopyrightMarker('Jane Doe (c)')).toBe(false)
    expect(hasLeadingCopyrightMarker(null)).toBe(false)
  })

  it('removes a leading marker and following whitespace', () => {
    expect(normalizeImageCredit('(c) Jane Doe')).toBe('Jane Doe')
    expect(normalizeImageCredit('(C)\tJane Doe')).toBe('Jane Doe')
    expect(normalizeImageCredit('(c) ')).toBeNull()
  })

  it('keeps non-matching credits unchanged', () => {
    expect(normalizeImageCredit('  (c) Jane Doe')).toBe('  (c) Jane Doe')
    expect(normalizeImageCredit('© Jane Doe')).toBe('© Jane Doe')
    expect(normalizeImageCredit('')).toBe('')
    expect(normalizeImageCredit(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test; confirm failure**

Run: `pnpm test src/utils/imageCredit.spec.ts`

Expected: FAIL. Module `./imageCredit` does not exist.

- [ ] **Step 3: Implement smallest pure utility**

```ts
const LEADING_COPYRIGHT_MARKER = /^\(c\)\s*/i

export function hasLeadingCopyrightMarker(value: unknown): boolean {
  return typeof value === 'string' && LEADING_COPYRIGHT_MARKER.test(value)
}

export function normalizeImageCredit(value: string | null): string | null {
  if (value === null || !hasLeadingCopyrightMarker(value)) return value

  const normalized = value.replace(LEADING_COPYRIGHT_MARKER, '')
  return normalized === '' ? null : normalized
}
```

- [ ] **Step 4: Run test; confirm pass**

Run: `pnpm test src/utils/imageCredit.spec.ts`

Expected: PASS. Three tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/imageCredit.ts src/utils/imageCredit.spec.ts
```

### Task 2: Admin Credit Warning

**Files:**
- Create: `src/components/admin/CreditField.spec.tsx`
- Create: `src/components/admin/CreditField.tsx`
- Create: `src/components/admin/CreditField.scss`
- Modify: `src/collections/Images.ts:57-63`

- [ ] **Step 1: Write failing field tests**

Mirror `src/components/admin/QuoteField.spec.tsx`. Mock `@payloadcms/ui`, set `field.value`, and assert:

```ts
expect(screen.getByRole('alert')).toHaveTextContent('Remove “(c)” from the beginning of the photo credit.')
expect(screen.getByRole('textbox')).toHaveAttribute('data-warning-class', 'credit-field-warning')
```

Add German copy assertion: `Bitte „(c)“ am Anfang des Bildnachweises entfernen.`. Add unmarked credit assertion that no `alert` exists and the warning has `credit-field-warning-hidden`.

- [ ] **Step 2: Run test; confirm failure**

Run: `pnpm test src/components/admin/CreditField.spec.tsx`

Expected: FAIL. Component does not exist.

- [ ] **Step 3: Implement `CreditField` and CSS**

Use `QuoteField.tsx` structure. Import `TextField`, `useField`, `useLocale`, `TextFieldClientProps`, and `hasLeadingCopyrightMarker`. Use `credit-field-warning` when predicate passes. Render a permanent `mt-2` warning-space wrapper and `role="alert"` only when warning is active. Use exact copy from Step 1.

Create `CreditField.scss` by copying the functional pattern from `QuoteField.scss`, renaming `quote-field-warning` to `credit-field-warning`; preserve hidden text without layout shift and warning border styling.

Register the component:

```ts
admin: {
  description: 'Photo credit or attribution (e.g., photographer name)',
  components: {
    Field: '/components/admin/CreditField',
  },
},
```

- [ ] **Step 4: Run component test; confirm pass**

Run: `pnpm test src/components/admin/CreditField.spec.tsx`

Expected: PASS.

- [ ] **Step 5: Regenerate admin import map**

Run: `pnpm generate:importmap`

Expected: exits 0; `src/app/(payload)/admin/importMap.js` registers `CreditField`.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/CreditField.tsx src/components/admin/CreditField.scss src/components/admin/CreditField.spec.tsx src/collections/Images.ts 'src/app/(payload)/admin/importMap.js'
```

### Task 3: Fixed-Purpose Image Revalidation Route

**Files:**
- Create: `src/app/api/revalidate-images/route.spec.ts`
- Create: `src/app/api/revalidate-images/route.ts`

- [ ] **Step 1: Write failing route tests**

Mock `getPayload` and `revalidatePath`. Test `POST` with no user returns 401; non-admin user returns 403; admin user returns 200 and calls:

```ts
expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]', 'layout')
```

Test `GET` returns 405 with `Allow: POST`. Test a POST body returns 400 before cache invalidation.

- [ ] **Step 2: Run test; confirm failure**

Run: `pnpm test src/app/api/revalidate-images/route.spec.ts`

Expected: FAIL. Route does not exist.

- [ ] **Step 3: Implement locked-down route**

```ts
import config from '@/payload.config'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

export async function POST(request: Request) {
  if ((await request.text()) !== '') return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: new Headers(request.headers) })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!('role' in user) || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  revalidatePath('/(frontend)/[locale]', 'layout')
  return NextResponse.json({ revalidated: true })
}

export function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'POST' } })
}
```

Wrap Payload initialization in `try/catch`; log server error and return 500. Do not accept paths, tags, locale, or JSON options.

- [ ] **Step 4: Run test; confirm pass**

Run: `pnpm test src/app/api/revalidate-images/route.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/revalidate-images/route.ts src/app/api/revalidate-images/route.spec.ts
```

### Task 4: Manifest-Driven Cleanup Script

**Files:**
- Create: `src/test/cleanImageCredits.spec.ts`
- Create: `scripts/db/cleanImageCredits.ts`

- [ ] **Step 1: Write failing script tests**

Export `parseArguments`, `createManifest`, `validateManifest`, and `runCleanup` from the script. Mock `getPayload`, temporary manifest files, and use image docs `{ id, filename, credit }`. Cover:

```ts
expect(mockPayload.find).toHaveBeenCalledWith({
  collection: 'images',
  where: { credit: { exists: true } },
  depth: 0,
  pagination: false,
  limit: 0,
})
```

Assert dry-run writes manifest and never calls `update`; malformed digest and missing `--manifest` reject; changed preflight manifest rejects before `update`; a per-image changed credit rejects before its update; update failure reports prior IDs and rejects.

- [ ] **Step 2: Run test; confirm failure**

Run: `pnpm test src/test/cleanImageCredits.spec.ts`

Expected: FAIL. Script module does not exist.

- [ ] **Step 3: Implement script**

The script must:

```ts
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { normalizeImageCredit } from '@/utils/imageCredit'
import config from '@/payload.config'
import { getPayload } from 'payload'
```

Define `CreditManifestEntry` as `{ id: number; filename: string; oldCredit: string; newCredit: string | null }` and `CreditManifest` as `{ entries: CreditManifestEntry[]; digest: string }`. Sort entries by numeric ID; calculate SHA-256 over `JSON.stringify(entries)`. Reject args except either `--manifest <path>` or `--apply --manifest <path>`.

Dry-run connects only after argument validation, queries all matching images, builds entries where `normalizeImageCredit(image.credit) !== image.credit`, prints JSON lines and summary, then writes JSON manifest with `mode: 'dry-run'` omitted from digest input.

Apply reads and validates manifest before `getPayload`, then re-queries and requires exact equal entries and digest. Before each update, call `payload.findByID({ collection: 'images', id, depth: 0 })`; if its credit differs from `oldCredit`, throw without updating that entry. Update only `{ credit: newCredit }` with `context: { skipRevalidation: true }`.

Keep the production URI / `NODE_ENV=production` guard from `backfillVideoLabels.ts`. `main()` runs only when `import.meta.url === new URL(process.argv[1], 'file:').href`, preserving test imports. Always call `await payload.db?.destroy?.()` in a `finally` after Payload starts.

- [ ] **Step 4: Run script tests; confirm pass**

Run: `pnpm test src/test/cleanImageCredits.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/db/cleanImageCredits.ts src/test/cleanImageCredits.spec.ts
```

### Task 5: Local Payload Integration Coverage

**Files:**
- Create: `src/test/imageCreditCleanup.integration.spec.ts`
- Modify: `scripts/db/cleanImageCredits.ts` only if integration exposes a real API mismatch

- [ ] **Step 1: Write failing disposable SQLite integration test**

Create a temporary directory in `beforeEach`, set `DATABASE_URI` to its `file:` database path and `DATABASE_AUTH_TOKEN=local`, then dynamically import Payload config and initialize `getPayload`. Create three images with credits `(c) Jane`, `(C) `, and `Jane`. Call exported `runCleanup` dry-run then apply against its manifest. Assert values remain unchanged after dry-run, become `Jane`, `null`, `Jane` after apply, and a mutated first credit causes preflight failure with zero updates.

- [ ] **Step 2: Run integration test; confirm failure**

Run: `pnpm test src/test/imageCreditCleanup.integration.spec.ts`

Expected: FAIL until script dependency injection supports a disposable Payload instance and temporary manifest path.

- [ ] **Step 3: Add minimal dependency injection required by integration**

Make `runCleanup` accept `{ payload, manifestPath, apply }`. `main()` remains responsible for `getPayload` and passes its instance to `runCleanup`. Keep production guard and manifest validation in `main()` before any production connection. Do not add database writes outside Payload Local API.

- [ ] **Step 4: Run integration test; confirm pass**

Run: `pnpm test src/test/imageCreditCleanup.integration.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/test/imageCreditCleanup.integration.spec.ts scripts/db/cleanImageCredits.ts
```

### Task 6: Full Verification and Local Execution

**Files:**
- No source changes expected.

- [ ] **Step 1: Run focused tests**

Run: `pnpm test src/utils/imageCredit.spec.ts src/components/admin/CreditField.spec.tsx src/app/api/revalidate-images/route.spec.ts src/test/cleanImageCredits.spec.ts src/test/imageCreditCleanup.integration.spec.ts`

Expected: PASS.

- [ ] **Step 2: Run static verification**

Run: `pnpm lint && pnpm typecheck && pnpm exec oxfmt --check src/utils/imageCredit.ts src/utils/imageCredit.spec.ts src/components/admin/CreditField.tsx src/components/admin/CreditField.scss src/components/admin/CreditField.spec.tsx src/collections/Images.ts 'src/app/(payload)/admin/importMap.js' src/app/api/revalidate-images/route.ts src/app/api/revalidate-images/route.spec.ts scripts/db/cleanImageCredits.ts src/test/cleanImageCredits.spec.ts src/test/imageCreditCleanup.integration.spec.ts`

Expected: all commands exit 0.

- [ ] **Step 3: Confirm local target before DB read**

Run: `grep DATABASE_URI .env`

Expected: `DATABASE_URI=file:./dev.db`.

Ask user to confirm local `dev.db`. Do not run a DB command until confirmed.

- [ ] **Step 4: Run local dry-run after explicit approval**

Run: `DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm exec tsx scripts/db/cleanImageCredits.ts --manifest data/dumps/image-credit-cleanup-dev.json`

Expected: prints matching IDs, old/new credits, count, and SHA-256 digest; writes manifest; no updates.

- [ ] **Step 5: Obtain explicit local write approval**

Show user exact count, IDs, values, target `dev.db`, and command below. Wait for explicit approval.

Run: `DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm exec tsx scripts/db/cleanImageCredits.ts --apply --manifest data/dumps/image-credit-cleanup-dev.json`

Expected: updates only manifest entries, no image uploads or relationship changes.

- [ ] **Step 6: Verify local cleanup and cache**

Run: `DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm exec tsx scripts/db/cleanImageCredits.ts --manifest data/dumps/image-credit-cleanup-dev-postcheck.json`

Expected: zero entries.

Call `POST /api/revalidate-images` from an authenticated admin browser session. Verify an image caption renders a single `©`.

- [ ] **Step 7: Commit only after user testing approval**

```bash
git status --short
```

Do not commit without explicit user approval.

### Task 7: Production Execution

**Files:**
- No source changes expected.

- [ ] **Step 1: Download and verify accepted R2 snapshot**

Follow `docs/memory/checklists.md` section 1 to download the Friday-or-newer nightly R2 snapshot to `/tmp/prod.db`, then run:

```bash
sqlite3 /tmp/prod.db "PRAGMA integrity_check;"
```

Expected: `ok`. Do not run `turso db export`.

- [ ] **Step 2: Confirm target and run production dry-run**

Run: `grep DATABASE_URI .env`

Expected: `DATABASE_URI=file:./dev.db`.

Confirm target `ksschoerke-production` with user. Then, without printing the token:

```bash
TOKEN=$(grep '^DATABASE_AUTH_TOKEN=' .env | cut -d= -f2)
DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" DATABASE_AUTH_TOKEN="$TOKEN" NODE_ENV=production pnpm exec tsx scripts/db/cleanImageCredits.ts --manifest data/dumps/image-credit-cleanup-production.json
```

Expected: writes production manifest and reports all proposed IDs, old/new values, count, and digest. No updates.

- [ ] **Step 3: Obtain final production-write approval**

Show user target `ksschoerke-production`, exact manifest count and IDs, value transformation `(c)` prefix removal only, R2 snapshot integrity result, and this command. Wait for explicit `yes, go ahead` or `proceed`.

```bash
TOKEN=$(grep '^DATABASE_AUTH_TOKEN=' .env | cut -d= -f2)
DATABASE_URI="libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io" DATABASE_AUTH_TOKEN="$TOKEN" NODE_ENV=production pnpm exec tsx scripts/db/cleanImageCredits.ts --apply --manifest data/dumps/image-credit-cleanup-production.json
```

Expected: updates only reviewed manifest entries. No image files, alt text, relationships, or other collections change.

- [ ] **Step 4: Verify production and revalidate cache**

Run the Step 2 command with `data/dumps/image-credit-cleanup-production-postcheck.json`.

Expected: zero manifest entries.

From an authenticated Payload admin session, call `POST /api/revalidate-images` with no request body. Confirm a production image caption displays a single `©`.
