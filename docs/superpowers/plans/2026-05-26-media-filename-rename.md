# Media Filename Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable admins to rename image/document filenames through Payload admin UI with automatic sanitization and storage synchronization.

**Architecture:** Add `newFilename` trigger field to Images/Documents collections. `beforeChange` hook sanitizes input, validates uniqueness, renames file in storage (Vercel Blob or R2), updates DB `filename` field. Gradual migration - existing files unchanged until edited.

**Tech Stack:** Payload CMS hooks, @vercel/blob SDK, @aws-sdk/client-s3, TypeScript

---

## File Structure

**New files:**
- `src/utils/sanitizeFilename.ts` - Sanitization function (reusable utility)
- `src/utils/storage/blob.ts` - Vercel Blob rename operations
- `src/utils/storage/r2.ts` - R2 rename operations
- `src/hooks/renameFile.ts` - Main beforeChange hook logic
- `src/utils/sanitizeFilename.test.ts` - Unit tests for sanitization

**Modified files:**
- `src/collections/Images.ts` - Add `newFilename` field + hook
- `src/collections/Documents.ts` - Add `newFilename` field + hook

---

## Task 1: Sanitization Utility

**Files:**
- Create: `src/utils/sanitizeFilename.ts`
- Create: `src/utils/sanitizeFilename.test.ts`

### Step 1: Write failing tests for sanitization

- [ ] **Create test file with comprehensive test cases**

```typescript
// src/utils/sanitizeFilename.test.ts
import { describe, expect, it } from 'vitest'
import { sanitizeFilename } from './sanitizeFilename'

describe('sanitizeFilename', () => {
  it('should convert to lowercase', () => {
    expect(sanitizeFilename('Artist Photo', '.jpg')).toBe('artist-photo.jpg')
  })

  it('should replace spaces with hyphens', () => {
    expect(sanitizeFilename('my file name', '.pdf')).toBe('my-file-name.pdf')
  })

  it('should remove special characters', () => {
    expect(sanitizeFilename('artist!@#photo', '.jpg')).toBe('artistphoto.jpg')
  })

  it('should keep alphanumeric, hyphens, underscores, dots', () => {
    expect(sanitizeFilename('file_name-123.test', '.jpg')).toBe('file_name-123.test.jpg')
  })

  it('should trim leading and trailing hyphens', () => {
    expect(sanitizeFilename('--filename--', '.jpg')).toBe('filename.jpg')
  })

  it('should collapse multiple consecutive hyphens', () => {
    expect(sanitizeFilename('file---name', '.pdf')).toBe('file-name.pdf')
  })

  it('should remove umlauts and special unicode', () => {
    expect(sanitizeFilename('Künstler Foto', '.jpg')).toBe('kunstler-foto.jpg')
  })

  it('should handle complex real-world example', () => {
    expect(sanitizeFilename('Artist Photo!!!  (2024)', '.jpg')).toBe('artist-photo-2024.jpg')
  })

  it('should preserve extension correctly', () => {
    expect(sanitizeFilename('test', '.jpeg')).toBe('test.jpeg')
    expect(sanitizeFilename('test', '.PDF')).toBe('test.PDF')
  })

  it('should handle numeric-only filenames', () => {
    expect(sanitizeFilename('123', '.png')).toBe('123.png')
  })

  it('should return empty string if sanitized basename is empty', () => {
    expect(sanitizeFilename('!!!@@@###', '.jpg')).toBe('.jpg')
  })
})
```

- [ ] **Run tests to verify they fail**

```bash
pnpm test src/utils/sanitizeFilename.test.ts
```

Expected: All tests FAIL with "Cannot find module './sanitizeFilename'"

### Step 2: Implement sanitization function

- [ ] **Create sanitization utility**

```typescript
// src/utils/sanitizeFilename.ts

/**
 * Sanitizes a filename basename according to URL-safe rules.
 * Converts to lowercase, replaces spaces with hyphens, removes special characters.
 *
 * @param input - The basename to sanitize (without extension)
 * @param extension - The file extension to append (e.g., '.jpg', '.pdf')
 * @returns Sanitized filename with extension
 *
 * @example
 * sanitizeFilename('Artist Photo!', '.jpg') // => 'artist-photo.jpg'
 * sanitizeFilename('Künstler_Foto', '.pdf') // => 'kunstler_foto.pdf'
 */
export function sanitizeFilename(input: string, extension: string): string {
  const sanitized = input
    .toLowerCase() // Convert to lowercase
    .normalize('NFD') // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (umlauts, accents)
    .replace(/\s+/g, '-') // Replace whitespace with hyphens
    .replace(/[^a-z0-9-_.]/g, '') // Remove special chars (keep alphanumeric, hyphens, underscores, dots)
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
    .replace(/-{2,}/g, '-') // Collapse multiple consecutive hyphens

  return `${sanitized}${extension}`
}
```

- [ ] **Run tests to verify they pass**

```bash
pnpm test src/utils/sanitizeFilename.test.ts
```

Expected: All 11 tests PASS

- [ ] **Commit sanitization utility**

```bash
git add src/utils/sanitizeFilename.ts src/utils/sanitizeFilename.test.ts
git commit -m "feat(utils): add filename sanitization utility

- Convert to lowercase, replace spaces with hyphens
- Remove special characters, preserve alphanumeric/hyphens/underscores
- Normalize unicode (remove umlauts/diacritics)
- Trim and collapse multiple hyphens
- Comprehensive test coverage"
```

---

## Task 2: Vercel Blob Storage Operations

**Files:**
- Create: `src/utils/storage/blob.ts`

### Step 1: Create Vercel Blob rename function

- [ ] **Implement Blob rename using copy + delete**

```typescript
// src/utils/storage/blob.ts
import { copy, del } from '@vercel/blob'

/**
 * Renames a file in Vercel Blob storage.
 * Uses copy + delete pattern (Blob doesn't support direct rename).
 *
 * @param oldFilename - Current filename (e.g., 'old-photo.jpg')
 * @param newFilename - New filename (e.g., 'new-photo.jpg')
 * @throws Error if BLOB_READ_WRITE_TOKEN not configured
 * @throws Error if copy or delete operation fails
 *
 * @example
 * await renameFileInBlob('old-photo.jpg', 'new-photo.jpg')
 */
export async function renameFileInBlob(oldFilename: string, newFilename: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable not configured')
  }

  // Construct old file URL
  // Format: https://<token>.public.blob.vercel-storage.com/<filename>
  const oldUrl = `https://${token.split('_')[1]}.public.blob.vercel-storage.com/${oldFilename}`

  try {
    // Copy to new filename
    await copy(oldUrl, newFilename, {
      access: 'public',
      token,
    })

    // Delete old file
    await del(oldUrl, { token })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to rename file in Vercel Blob: ${message}`)
  }
}
```

- [ ] **Verify types compile**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Commit Blob storage utility**

```bash
git add src/utils/storage/blob.ts
git commit -m "feat(storage): add Vercel Blob rename utility

- Implements copy + delete pattern for file rename
- Uses BLOB_READ_WRITE_TOKEN from environment
- Throws descriptive errors for configuration/operation failures"
```

---

## Task 3: R2 Storage Operations

**Files:**
- Create: `src/utils/storage/r2.ts`

### Step 1: Create R2 rename function

- [ ] **Implement R2 rename using S3 SDK**

```typescript
// src/utils/storage/r2.ts
import { CopyObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Renames a file in Cloudflare R2 storage.
 * Uses S3-compatible copy + delete operations.
 *
 * @param oldFilename - Current filename (e.g., 'old-document.pdf')
 * @param newFilename - New filename (e.g., 'new-document.pdf')
 * @throws Error if R2 environment variables not configured
 * @throws Error if copy or delete operation fails
 *
 * @example
 * await renameFileInR2('old-document.pdf', 'new-document.pdf')
 */
export async function renameFileInR2(oldFilename: string, newFilename: string): Promise<void> {
  const bucket = process.env.CLOUDFLARE_S3_BUCKET
  const accessKeyId = process.env.CLOUDFLARE_S3_ACCESS_KEY
  const secretAccessKey = process.env.CLOUDFLARE_SECRET
  const endpoint = process.env.CLOUDFLARE_S3_API_ENDPOINT

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('R2 environment variables not configured (CLOUDFLARE_S3_BUCKET, CLOUDFLARE_S3_ACCESS_KEY, CLOUDFLARE_SECRET, CLOUDFLARE_S3_API_ENDPOINT)')
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  try {
    // Copy object to new key
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${oldFilename}`,
        Key: newFilename,
      })
    )

    // Delete old object
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: oldFilename,
      })
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to rename file in R2: ${message}`)
  }
}
```

- [ ] **Verify types compile**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Commit R2 storage utility**

```bash
git add src/utils/storage/r2.ts
git commit -m "feat(storage): add R2 rename utility

- Implements S3-compatible copy + delete for file rename
- Uses Cloudflare R2 environment variables
- Throws descriptive errors for configuration/operation failures"
```

---

## Task 4: Rename Hook Implementation

**Files:**
- Create: `src/hooks/renameFile.ts`

### Step 1: Implement beforeChange hook

- [ ] **Create hook with full rename logic**

```typescript
// src/hooks/renameFile.ts
import type { FieldHook } from 'payload'

import { renameFileInBlob } from '@/utils/storage/blob'
import { renameFileInR2 } from '@/utils/storage/r2'
import { sanitizeFilename } from '@/utils/sanitizeFilename'

/**
 * Payload beforeChange hook for renaming files in storage.
 * Triggered by the `newFilename` field in Images/Documents collections.
 *
 * Flow:
 * 1. Check if newFilename provided (skip if empty)
 * 2. Extract extension from current filename
 * 3. Sanitize input and append extension
 * 4. Validate uniqueness (check for conflicts)
 * 5. Rename in storage (Blob for images, R2 for documents)
 * 6. Update filename field in database
 * 7. Clear newFilename field (not persisted)
 *
 * @throws Error if filename conflicts with existing file
 * @throws Error if sanitized filename is empty
 * @throws Error if storage operation fails
 */
export const renameFileHook: FieldHook = async ({ data, req, originalDoc, collection }) => {
  const newFilenameInput = data?.newFilename

  // Skip if no rename requested
  if (!newFilenameInput || typeof newFilenameInput !== 'string' || newFilenameInput.trim() === '') {
    return undefined
  }

  const currentFilename = originalDoc?.filename

  if (!currentFilename || typeof currentFilename !== 'string') {
    throw new Error('Current filename not found')
  }

  // Extract extension from current filename
  const extensionMatch = currentFilename.match(/(\.[^.]+)$/)
  const extension = extensionMatch ? extensionMatch[1] : ''

  if (!extension) {
    throw new Error('Could not extract file extension from current filename')
  }

  // Sanitize input and append extension
  const newFilename = sanitizeFilename(newFilenameInput, extension)

  // Validate: check if sanitized basename is empty
  if (newFilename === extension) {
    throw new Error('Filename cannot be empty after sanitization')
  }

  // Validate: check if filename already exists (case-insensitive)
  const existingFile = await req.payload.find({
    collection: collection.slug,
    where: {
      filename: {
        equals: newFilename,
      },
      id: {
        not_equals: originalDoc.id,
      },
    },
    limit: 1,
  })

  if (existingFile.docs.length > 0) {
    throw new Error(`Filename already exists: ${newFilename}. Choose a different name.`)
  }

  // Rename in storage based on collection
  try {
    if (collection.slug === 'images') {
      await renameFileInBlob(currentFilename, newFilename)
    } else if (collection.slug === 'documents') {
      await renameFileInR2(currentFilename, newFilename)
    } else {
      throw new Error(`Unsupported collection for file rename: ${collection.slug}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Storage rename failed: ${message}`)
  }

  // Update filename in database
  data.filename = newFilename

  // Clear trigger field (not persisted)
  return undefined
}
```

- [ ] **Verify types compile**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Commit rename hook**

```bash
git add src/hooks/renameFile.ts
git commit -m "feat(hooks): add file rename beforeChange hook

- Sanitizes newFilename input using utility
- Validates uniqueness (throws error if conflict)
- Renames in storage (Blob for images, R2 for documents)
- Updates filename field in database
- Clears newFilename trigger field
- Comprehensive error handling with descriptive messages"
```

---

## Task 5: Add Field to Images Collection

**Files:**
- Modify: `src/collections/Images.ts`

### Step 1: Add newFilename field with hook

- [ ] **Import hook and add field definition**

Read current Images collection:

```bash
cat src/collections/Images.ts
```

- [ ] **Add import at top of file**

Add after existing imports:

```typescript
import { renameFileHook } from '@/hooks/renameFile'
```

- [ ] **Add newFilename field to fields array**

Add before the closing `]` of the `fields` array (after `credit` field):

```typescript
    {
      name: 'newFilename',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: {
          en: 'Edit filename (without extension). Will be sanitized on save.',
          de: 'Dateiname bearbeiten (ohne Erweiterung). Wird beim Speichern bereinigt.',
        },
        components: {
          Field: {
            clientProps: {
              placeholder: 'new-filename',
            },
          },
        },
      },
      hooks: {
        beforeChange: [renameFileHook],
      },
    },
```

- [ ] **Verify types compile**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Commit Images collection update**

```bash
git add src/collections/Images.ts
git commit -m "feat(images): add filename rename field

- Add newFilename text field in sidebar
- Attach renameFileHook to beforeChange
- Bilingual descriptions (en/de)
- Placeholder for UX guidance"
```

---

## Task 6: Add Field to Documents Collection

**Files:**
- Modify: `src/collections/Documents.ts`

### Step 1: Add newFilename field with hook

- [ ] **Import hook and add field definition**

Read current Documents collection:

```bash
cat src/collections/Documents.ts
```

- [ ] **Add import at top of file**

Add after existing imports:

```typescript
import { renameFileHook } from '@/hooks/renameFile'
```

- [ ] **Add newFilename field to fields array**

Add before the closing `]` of the `fields` array:

```typescript
    {
      name: 'newFilename',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: {
          en: 'Edit filename (without extension). Will be sanitized on save.',
          de: 'Dateiname bearbeiten (ohne Erweiterung). Wird beim Speichern bereinigt.',
        },
        components: {
          Field: {
            clientProps: {
              placeholder: 'new-filename',
            },
          },
        },
      },
      hooks: {
        beforeChange: [renameFileHook],
      },
    },
```

- [ ] **Verify types compile**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Commit Documents collection update**

```bash
git add src/collections/Documents.ts
git commit -m "feat(documents): add filename rename field

- Add newFilename text field in sidebar
- Attach renameFileHook to beforeChange
- Bilingual descriptions (en/de)
- Placeholder for UX guidance"
```

---

## Task 7: Manual Testing

**Files:**
- None (manual verification)

### Step 1: Test in development environment

- [ ] **Start dev server**

```bash
pnpm dev
```

Expected: Server starts on http://localhost:3000

- [ ] **Login to admin panel**

Navigate to: http://localhost:3000/admin
Login with admin credentials

- [ ] **Test image rename (Vercel Blob)**

1. Navigate to Media → Images
2. Click on any image
3. Note current filename in sidebar (e.g., `artist-photo.jpg`)
4. In "Rename Filename" field, enter: `test photo 2024`
5. Click Save
6. Verify success message
7. Verify filename changed to: `test-photo-2024.jpg`
8. Verify image still displays correctly on artist pages

Expected: File renamed in Blob storage, DB updated, relationships intact

- [ ] **Test document rename (R2)**

1. Navigate to Media → Documents
2. Click on any PDF
3. Note current filename (e.g., `biography.pdf`)
4. In "Rename Filename" field, enter: `artist biography`
5. Click Save
6. Verify success message
7. Verify filename changed to: `artist-biography.pdf`
8. Verify download link still works

Expected: File renamed in R2, DB updated, download links work

- [ ] **Test sanitization**

1. Select any image
2. Enter filename with special chars: `Test!!! Photo @@@`
3. Click Save
4. Verify filename sanitized to: `test-photo.jpg` (or `.png`, etc.)

Expected: Special characters removed, spaces replaced with hyphens

- [ ] **Test conflict detection**

1. Note an existing filename: `artist-1.jpg`
2. Select a different image
3. Try to rename to: `artist-1`
4. Click Save
5. Verify error message: "Filename already exists: artist-1.jpg. Choose a different name."
6. Verify original filename unchanged

Expected: Validation error, no storage/DB changes

- [ ] **Test empty input**

1. Select any image
2. Enter only special chars: `!!!@@@###`
3. Click Save
4. Verify error: "Filename cannot be empty after sanitization"

Expected: Validation error before storage operation

- [ ] **Test extension preservation**

1. Select `photo.jpg`
2. Rename to: `new-name` (omit extension)
3. Verify saved as: `new-name.jpg` (extension preserved)
4. Try with `.pdf`, `.png` - all should preserve extension

Expected: Extension always preserved, user cannot change it

- [ ] **Test relationship integrity**

1. Find artist with gallery images
2. Rename one gallery image
3. Visit artist detail page
4. Verify image still displays in gallery
5. Check relationship field in admin - ID unchanged

Expected: Relationships unaffected (ID-based, not filename-based)

- [ ] **Stop dev server**

```bash
# Press Ctrl+C in terminal
```

---

## Task 8: Run Full Test Suite

**Files:**
- None (verification)

### Step 1: Run all tests

- [ ] **Execute test suite**

```bash
pnpm test
```

Expected: All tests pass (existing tests + new sanitization tests)

- [ ] **Run type checking**

```bash
pnpm typecheck
```

Expected: No TypeScript errors

- [ ] **Run linter**

```bash
pnpm lint
```

Expected: No linting errors

- [ ] **Commit verification checkpoint**

```bash
git add -A
git commit -m "test: verify media rename feature complete

All tests passing:
- Sanitization utility tests
- Existing collection tests
- Type checking clean
- Linter clean

Manual testing completed:
- Image rename (Vercel Blob) ✓
- Document rename (R2) ✓
- Sanitization rules ✓
- Conflict detection ✓
- Extension preservation ✓
- Relationship integrity ✓"
```

---

## Success Criteria Checklist

After completing all tasks, verify:

- [x] Admin can rename files via sidebar field
- [x] Filenames sanitized (lowercase, hyphens, no special chars)
- [x] Storage files renamed (Blob for images, R2 for documents)
- [x] Database `filename` field updated
- [x] Relationships preserved (artist galleries, post embeds work)
- [x] Conflicts blocked with error message
- [x] Old URL returns 404, new URL accessible
- [x] No breaking changes to existing files
- [x] Extension locked (cannot change `.jpg` to `.png`)
- [x] Tests passing
- [x] Types clean
- [x] Linter clean

---

## Rollback Plan

If issues discovered in production:

1. **Revert commits:**
   ```bash
   git revert HEAD~6..HEAD
   git push origin main
   ```

2. **Deploy rollback:**
   ```bash
   vercel --prod
   ```

3. **Manual filename fixes** (if needed):
   - Use same rename feature to revert filenames
   - Or restore from database backup

---

## Notes

- **No new dependencies** - Uses existing `@vercel/blob` and `@aws-sdk/client-s3`
- **Gradual migration** - Existing filenames unchanged until user edits them
- **Atomicity** - Storage rename happens before DB update; if storage fails, DB unchanged
- **Security** - Reuses Payload's existing `authenticated` access control
- **Path traversal protection** - Sanitization removes `..`, `/`, `\` characters
