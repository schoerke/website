# Image Delete Protection

## Goal

Stop deletion of an image currently used by structured site content.

## Change

Add one `beforeDelete` hook to `Images`.

On image deletion, use Payload Local API to check these fields for the image ID:

- `artists.image`
- `artists.galleryImages.image`
- `employees.image`
- `posts.image` on published posts only
- `recordings.coverArt`

Each check uses `limit: 1`, `pagination: false`, `depth: 0`, and `select: {}`.
Payload returns implicit IDs for this empty selection. Stop checking after the
first match.

If any field references the image, throw public `APIError` with this message:

```
This image is in use and cannot be deleted. Remove or replace it first.
```

Payload Admin shows its normal error toast. The image and its file remain.

If no field references the image, deletion continues unchanged.

## Cost

No new fields or migrations. No work during normal page loads, uploads, or
content saves. The hook performs at most five small database queries only when
an admin clicks delete.

## Tests

- Every listed field blocks deletion.
- Draft posts do not block deletion; published posts do.
- Unused image permits deletion.
- Error message is returned.

## Out Of Scope

- Rich-text embedded images.
- Historical versions and draft post references.
- Bulk deletion behavior.
- Concurrent edit/delete race conditions.
