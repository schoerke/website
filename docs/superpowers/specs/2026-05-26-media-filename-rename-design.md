# Media Filename Rename Feature

**Date:** 2026-05-26  
**Status:** Approved

## Overview

Add ability for admins to rename image and document filenames through the Payload CMS admin UI. Users edit a text field with the basename (without extension), system sanitizes input, validates uniqueness, renames file in storage (Vercel Blob or Cloudflare R2), and updates database. Relationships remain intact (ID-based references unaffected).

## Requirements

### Functional Requirements

1. **Admin UI field** for renaming filenames in Images and Documents collections
2. **Basename editing only** - Extension locked (cannot change `.jpg` to `.png`)
3. **Automatic sanitization** - Lowercase, replace spaces with hyphens, remove special characters
4. **Uniqueness validation** - Block renames that conflict with existing filenames
5. **Storage synchronization** - Rename file in Vercel Blob (images) or R2 (documents), update database
6. **Relationship preservation** - ID-based relationships (artist galleries, post embeds) unaffected
7. **Gradual migration** - Existing filenames unchanged until manually edited

### Non-Functional Requirements

1. **Error handling** - Clear validation messages for conflicts, empty names, storage failures
2. **Atomicity** - Database update only if storage rename succeeds
3. **Security** - Reuse existing Payload authentication/authorization
4. **Performance** - Single file operation per save (no batch operations initially)

## Architecture

### Data Model

**Collections affected:** `images`, `documents`

**New field added to both collections:**

```typescript
{
  name: 'newFilename',
  type: 'text',
  admin: {
    position: 'sidebar',
    description: 'Edit filename (without extension). Will be sanitized on save.',
  },
  hooks: {
    beforeChange: [renameFileHook],
  },
}
```

**Field behavior:**
- Displays current filename basename (e.g., `artist-photo` from `artist-photo.jpg`)
- User edits and saves
- `beforeChange` hook intercepts, sanitizes input, renames storage file, updates `filename` field
- Field value cleared after successful rename (not persisted to database)

**Database schema:** No changes. Uses existing `filename` field. `newFilename` is UI-only trigger.

### Sanitization Logic

**Function:** `sanitizeFilename(input: string, extension: string): string`

**Rules applied:**
1. Convert to lowercase
2. Replace whitespace with hyphens
3. Remove special characters (keep alphanumeric, hyphens, underscores, dots)
4. Trim leading/trailing hyphens
5. Collapse multiple consecutive hyphens
6. Append original extension

**Examples:**
- `"Artist Photo!.jpg"` → `"artist-photo.jpg"`
- `"Künstler_Foto"` → `"kunstler_foto.pdf"`
- `"My  File--Name"` → `"my-file-name.jpg"`
- `"123"` → `"123.png"`

**Extension preservation:**
- Extract extension from current `filename` field
- User cannot modify extension
- Sanitized basename + original extension = new filename

### Storage Operations

**Hook implementation:** `src/hooks/renameFile.ts`

**Flow:**

1. **Check trigger field** - If `newFilename` is empty, skip (no rename requested)
2. **Extract current filename** - From `data.filename`
3. **Extract extension** - From current filename (e.g., `.jpg`, `.pdf`)
4. **Sanitize input** - Apply rules, append extension
5. **Validate uniqueness** - Query collection for conflicts: `where: { filename: { equals: newFilename } }`
6. **Determine storage adapter** - Check `collection.slug`:
   - `images` → Vercel Blob (`@vercel/blob`)
   - `documents` → Cloudflare R2 (AWS S3 SDK)
7. **Rename in storage:**
   - **Vercel Blob:** `copy(oldUrl, newFilename)` + `del(oldUrl)`
   - **R2:** `s3.copyObject(...)` + `s3.deleteObject(...)`
8. **Update database** - Set `data.filename = newFilename`
9. **Clear trigger field** - Set `data.newFilename = undefined`

**Error handling:**

- **Conflict detected** → Throw validation error: `"Filename already exists: {newFilename}. Choose different name."`
- **Empty after sanitization** → Throw validation error: `"Filename cannot be empty."`
- **Storage operation fails** → Throw error, database unchanged, admin sees error message

**Atomicity guarantee:**
- Storage rename happens before database update
- If storage fails, hook throws error → Payload aborts save → database unchanged
- If database update fails, old storage file still exists (manually clean up via storage dashboard)

### Storage Adapter Integration

**Vercel Blob (Images):**

```typescript
import { copy, del } from '@vercel/blob'

// Get current file URL from database record
const oldUrl = `https://${process.env.BLOB_READ_WRITE_TOKEN}.public.blob.vercel-storage.com/${oldFilename}`

// Copy to new filename
await copy(oldUrl, newFilename, { access: 'public' })

// Delete old file
await del(oldUrl)
```

**Cloudflare R2 (Documents):**

```typescript
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_S3_API_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_S3_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_SECRET,
  },
})

// Copy object to new key
await s3.send(new CopyObjectCommand({
  Bucket: process.env.CLOUDFLARE_S3_BUCKET,
  CopySource: `${process.env.CLOUDFLARE_S3_BUCKET}/${oldFilename}`,
  Key: newFilename,
}))

// Delete old object
await s3.send(new DeleteObjectCommand({
  Bucket: process.env.CLOUDFLARE_S3_BUCKET,
  Key: oldFilename,
}))
```

## User Experience

### Admin Workflow

1. Navigate to **Media → Images** (or **Media → Documents**)
2. Click on a file to open detail view
3. Sidebar shows **"Rename Filename"** field
   - Current value: `artist-photo` (basename only)
   - Description: "Edit basename only. Extension locked. Will be sanitized."
4. Edit field: `artist-photo` → `artist portrait 2024`
5. Click **Save**
6. System sanitizes to: `artist-portrait-2024.jpg`
7. Success message: **"File renamed to artist-portrait-2024.jpg"**
8. Field clears, ready for next rename
9. File accessible at new URL, old URL returns 404

### Error States

**Conflict detected:**
```
❌ Filename already exists: artist-portrait-2024.jpg. Choose different name.
```

**Empty after sanitization:**
```
❌ Filename cannot be empty.
```

**Storage operation failed:**
```
❌ Failed to rename file in storage. Try again.
```

**Validation displayed:** Standard Payload field error (red border, error text below field)

## Testing Strategy

### Manual Test Cases

1. **Basic rename**
   - Rename `artist-photo.jpg` → `new-name.jpg`
   - Verify storage file renamed (check Vercel/R2 dashboard)
   - Verify database `filename` field updated
   - Verify file accessible at new URL
   - Verify old URL returns 404

2. **Sanitization**
   - Input: `Artist Photo!!!`
   - Expected: `artist-photo.jpg`
   - Verify spaces → hyphens, special chars removed, lowercase

3. **Extension preservation**
   - Rename `photo.jpg` → `new-name` (user omits extension)
   - Expected: `new-name.jpg` (`.jpg` preserved)
   - Verify extension cannot be changed

4. **Conflict detection**
   - Upload two files: `test-1.jpg`, `test-2.jpg`
   - Rename `test-2.jpg` → `test-1`
   - Expected: Validation error, no storage/DB changes

5. **Empty input**
   - Input: `!!!@@@###` (only special chars)
   - Expected: Validation error (sanitizes to empty string)

6. **Both collections**
   - Test image file (Vercel Blob storage)
   - Test document file (R2 storage)
   - Verify both adapters work correctly

7. **Relationship integrity**
   - Rename image used in artist gallery
   - Verify artist detail page still shows image
   - Verify relationship field (ID) unchanged

8. **Post embedded images**
   - Find post with embedded image in rich text
   - Rename the embedded image
   - Verify post still renders image (relationship preserved)

### Automated Tests (Optional)

**Unit tests:** `src/hooks/renameFile.test.ts`
- Test `sanitizeFilename()` function with various inputs
- Test extension extraction logic
- Mock Payload API, verify hook logic flow

**Integration tests:** (Requires test database + storage)
- Mock `@vercel/blob` SDK
- Mock AWS S3 SDK
- Verify database updated only after storage success
- Verify atomicity (storage fails → database unchanged)

## Rollback Plan

1. **Backup before testing in production**
   - Dump `images` and `documents` collections: `turso db shell ... ".dump"`
   - Keep list of current filenames for reference

2. **Manual rollback if needed**
   - Use same rename feature to revert to original filenames
   - Or restore database from backup + manually rename files in storage

3. **No breaking changes**
   - Existing URLs unaffected until user explicitly renames
   - Gradual migration → low risk

## Implementation Notes

### File Structure

**New files:**
- `src/hooks/renameFile.ts` - Main hook implementation
- `src/utils/sanitizeFilename.ts` - Sanitization function (reusable)
- `src/utils/storage.ts` - Storage adapter wrappers (Blob, R2)

**Modified files:**
- `src/collections/Images.ts` - Add `newFilename` field
- `src/collections/Documents.ts` - Add `newFilename` field

### Environment Variables Required

Already exist in `.env`:
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob authentication
- `CLOUDFLARE_S3_BUCKET` - R2 bucket name
- `CLOUDFLARE_S3_ACCESS_KEY` - R2 access key
- `CLOUDFLARE_SECRET` - R2 secret key
- `CLOUDFLARE_S3_API_ENDPOINT` - R2 endpoint URL

### Dependencies

Already installed:
- `@vercel/blob` - Vercel Blob SDK
- `@aws-sdk/client-s3` - AWS S3 SDK (for R2)

No new dependencies required.

### Security Considerations

1. **Authentication** - Reuses Payload's `authenticated` access control (only logged-in admins can rename)
2. **Authorization** - Same permissions as file upload/delete (admin only)
3. **Path traversal** - Sanitization removes `..`, `/`, `\` characters
4. **File overwrite** - Blocked by uniqueness validation
5. **URL injection** - Sanitization removes all special characters except safe ones

## Future Enhancements (Out of Scope)

1. **Bulk rename** - Select multiple files, apply pattern (e.g., `artist-{n}.jpg`)
2. **Rename preview** - Show sanitized filename before saving
3. **Undo** - Revert to previous filename (requires filename history)
4. **Migration script** - One-time sanitization of all existing files
5. **URL redirect** - Keep old URL working for 30 days (requires CDN/proxy support)

## Success Criteria

1. ✅ Admin can rename files via UI field
2. ✅ Filenames sanitized according to rules
3. ✅ Storage files renamed (Blob + R2)
4. ✅ Database `filename` field updated
5. ✅ Relationships preserved (artist galleries, post embeds)
6. ✅ Conflicts blocked with clear error message
7. ✅ Old URL returns 404, new URL works
8. ✅ No breaking changes to existing files
