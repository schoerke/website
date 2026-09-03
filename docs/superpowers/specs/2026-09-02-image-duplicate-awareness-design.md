# Image Filename Warning Design

## Goal

Warn editors when selected image filename exactly matches an existing Image record.
Warning is awareness only. Upload remains enabled.

## Scope

- Image create/edit screen only.
- Exact, case-sensitive match against stored `images.filename`.
- No Blob adapter configuration change.
- No database schema or data change.
- No duplicate blocking, automatic renaming, hashing, or visual similarity check.
- Bulk upload remains unchanged.

## Rationale

Direct Vercel Blob uploads can overwrite a Blob before Payload creates the new
document. The warning gives editors chance to rename/select another file before
saving. It does not make Blob upload safe or prevent duplicate upload.

`addRandomSuffix: true` is deliberately excluded. In Payload 3.88 Vercel Blob
adapter, generated thumbnail Blob keys receive independent suffixes while stored
size metadata does not receive those names. This can create thumbnail 404s.

## Design

### Admin Upload Wrapper

Set `Images.admin.components.edit.Upload` to a project wrapper. The wrapper uses
Payload's public `Upload` component from `@payloadcms/ui`, preserving stock form
state, picker, drag/drop, crop, direct upload, and replacement behavior.

Its `onChange` observes selected upload value. When value contains a local file,
read its basename and call `checkImageFilename`.

The wrapper must:

- Clear prior status when no local file is selected.
- Ignore stale async responses after file selection changes or component unmounts.
- Treat paste-URL, filename-text edits, and crop/focal reprocessing as no-check
  paths unless `onChange` exposes a local `File`.
- Never delay, disable, reject, rename, or otherwise alter upload/save behavior.

### Server Action And Service

`checkImageFilename` accepts a bounded filename string and returns only:

```ts
{
  exists: boolean
}
```

It obtains current authenticated Payload admin identity from request cookies and
headers. Missing identity returns a generic lookup failure, never existence data.

The service queries Image documents through Payload Local API with
`overrideAccess: false`, limit `1`, and exact equality on `filename`. It returns
no image identifiers, URLs, credits, alt text, or other metadata.

Input is reduced to basename only. No case folding, Unicode normalization,
suffix stripping, extension conversion, or sanitization is applied. This means
the warning compares selected client basename verbatim to current persisted
filename; it is not logical-original-image duplicate detection.

### Editor Status

Matching file status:

`An image named “<filename>” already exists. Upload can continue.`

Lookup failure status:

`Could not check for an existing image. Upload can continue.`

Render status persistently beside stock upload controls with `role="status"`.
Do not use a blocking error or toast-only notice.

## Bulk Upload

Payload list bulk upload bypasses collection edit Upload component. Do not replace
or customize bulk UI in this iteration. Bulk uploads receive no warning.

## Tests

### Service And Action

- Existing exact filename returns `{ exists: true }`.
- Absent filename returns `{ exists: false }`.
- Query has `limit: 1` and `overrideAccess: false`.
- Missing authenticated identity produces generic failure.
- Input rejects non-string and overlong names.

### Upload Wrapper

- Local matching file displays warning.
- Local nonmatching file clears warning.
- Clear/new selection clears old status.
- Stale lookup response cannot replace newer selection result.
- Lookup failure displays nonblocking status.
- Upload/Save controls remain enabled.
- Non-local values do not trigger lookup.

### Verification

- Regenerate Payload import map after registering admin component.
- Run focused tests, lint, typecheck, and formatter check.
- Manual admin smoke: select a known duplicate filename, see warning, then save;
  confirm upload still behaves as before.

## Risks And Limits

- Warning may arrive asynchronously after user has started saving. It is not an
  upload gate.
- Direct Blob overwrite incident remains technically possible if warning is
  ignored. This iteration only improves editor awareness.
- Exact stored-name matching misses variations in case, Unicode, extension, and
  previously suffixed filenames.
- Existing filename lookup consumers remain unchanged because this feature does
  not alter stored names.
