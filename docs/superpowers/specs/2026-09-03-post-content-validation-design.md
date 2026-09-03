# Post Content Validation Design

Date: 2026-09-03
Status: Approved

## Summary

Show immediate structural feedback in Posts rich text, allow invalid drafts, and reject invalid
published posts.

## Scope

- Applies only to localized `Posts.content`.
- Inspects Lexical `root.children` in submitted editor state.
- No schema migration, generated type change, or database operation.

## Validation Rules

- The first top-level node must be text-bearing, not a block. An empty or whitespace-only first
  paragraph is invalid. Video, audio, Event Dates, and every other block are invalid first nodes.
- The final top-level node must not be an empty or whitespace-only paragraph. This rejects
  trailing newlines created by the editor.
- "Text-bearing" means descendant text recursively joined from the first node, then trimmed with
  JavaScript `String.prototype.trim()`. A paragraph containing only linebreak nodes is empty.
- Trailing-newline validation inspects only final paragraph nodes using the same recursive text
  rule. A final non-paragraph node is permitted. This rule is labelled "empty trailing paragraph",
  not "trailing newline".
- A structural validator rejects a value without an object `root`, non-empty `root.children`
  array, or inspectable first/final node object. It does not attempt full Lexical-schema validation.
  Missing and empty content continue to use Lexical's required error.

## Admin Feedback

- A Posts-only Lexical editor feature (`createServerFeature`/`createClientFeature`, matching the
  existing `EventDatesConversionFeature` pattern) mounts a plugin that observes editor state and
  runs `validatePostContentErrors` immediately, including an initial `editor.getEditorState()`
  evaluation before it registers `editor.registerUpdateListener`.
- Invalid state adds `post-content-warning` to the outer `.field-type.rich-text-lexical` wrapper
  and renders a Payload-native `Banner` (error-styled, `--theme-warning-*` colors) listing every
  currently violated rule as a bulleted list, in German or English.
- Valid state removes the border and hint.
- This feedback is advisory. It appears while editing regardless of draft validation settings.

## Implementation

- Add a pure, exported `validatePostContent` function in a client-safe shared module. It returns
  `true` or a stable error ID: `malformed`, `leadingBlock`, `emptyFirstLine`, or
  `emptyTrailingParagraph`. It does not validate full Lexical node schemas. A companion
  `validatePostContentErrors` returns every currently violated rule (not just the first) for
  admin display.
- Add a Posts-only Lexical editor feature. Its client plugin renders inside the rich-text field's
  plugin area, observes Lexical state, toggles the warning class, and lists every violated rule
  via `Banner` with DE/EN hint text.
- `versions.drafts.validate` stays `true` (Payload's collection-wide default enforcement). This
  keeps `title`, `slug`, and `createdBy` required checks active on draft saves. Draft-vs-publish
  content bypass is scoped to the content field only: the field validator returns `true`
  immediately when `options.data._status === 'draft'` (Payload sets this before field validation
  runs for ordinary create/update — verified against `collections/operations/utilities/update.js`).
  A blanket `drafts.validate: false` was considered and rejected: it disables required validation
  for every field on the collection, not just content.
- Field validation remains configured for publish writes. Its async validator runs in this order:
  content-field draft bypass (`_status === 'draft'`); Payload/Lexical required validation for
  absent or empty content; structural shape validation for non-empty input;
  `options.editor.validate(value, options)`; then first/final content rules. This prevents
  malformed nodes throwing during Lexical traversal, while preserving recursive validation for
  Event Dates, Video, Audio, and all other configured nodes.
- Trusted callers using `skipValidation` remain an explicit server-side bypass.

## Testing

- Unit-test valid text-first content.
- Reject missing, empty, and whitespace-only first paragraphs.
- Reject Video and Audio blocks as first nodes.
- Reject empty and whitespace-only trailing paragraphs.
- Accept non-empty final content and blocks after text-first content.
- Test immediate client warning border and hint for each structural error, plus removal after a
  valid edit.
- Test initial empty editor state and confirm the warning class targets the outer rich-text field
  wrapper.
- Test draft saves skip server validation and publish saves invoke the composed validator.
- Verify composed publish validation retains required checks and invalid Event Dates, Video, and
  Audio block-field validation. Include realistic block JSON: `type: 'block'` with
  `fields.blockType`.
- Test malformed non-empty input, nested formatted/link text, linebreak-only paragraphs, and
  `null`/primitive/root-null child values. Assert malformed input returns an error without throwing.

## Verification

- `pnpm lint`
- Targeted Vitest test file
- `pnpm typecheck`

## Out Of Scope

- Auto-removing invalid editor nodes.
- Client-side enforcement. The wrapper's live feedback is advisory only.
- Changing validation for Pages, Guides, Repertoire, or other rich-text fields.

## Known Limitation

- **Version restore.** Payload's `restoreVersion` operation always runs field validation
  regardless of the restored version's original draft/published status, and passes the
  historical version's own `_status` value as `options.data._status` — not the target status of
  the restore action (verified against `collections/operations/restoreVersion.js`). Restoring a
  formerly-*draft* version while choosing "restore as published" can therefore bypass structural
  content validation, because the content-field draft check reads the snapshot's stale `_status`.
  No public Payload 3.88 `ValidateOptions` field distinguishes this case. Accepted as a narrow,
  low-likelihood gap specific to the version-restore admin action; normal draft/publish
  create/update flows are unaffected.
