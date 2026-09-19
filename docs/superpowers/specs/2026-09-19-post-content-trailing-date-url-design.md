# Post Content Trailing Date/URL Reminder Design

Date: 2026-09-19
Status: Approved

## Summary

Remind editors to use the `EventDates` block when the post's final paragraph looks like a
manually-typed event line (a date plus a link), following the same pattern that motivated the
`EventDates` block (post 242's "4. Juli 2026, Yamagata" linked lines). This is advisory only and
never blocks saving or publishing.

## Scope

- Applies only to localized `Posts.content`, reusing the existing advisory infrastructure in
  `src/validators/postContent.ts` and `src/features/postContentWarning/`.
- Inspects only the last top-level `root.children` node (same node already inspected for
  `emptyTrailingParagraph`).
- Purely advisory: does not participate in `validatePostContent`, `validatePostContentErrors`, or
  the server-side `validatePublishedPostContent` publish validator. Publishing is unaffected.

## Detection Rule

A new pure function, `hasTrailingDateUrl(value: unknown): boolean`, returns true only when all of
the following hold for the last top-level node:

- The node's `type` is `paragraph`.
- A single recursive, order-preserving descent over the paragraph's descendants (left-to-right,
  document order — NOT `hasText`'s pop-from-end stack traversal, which visits children in reverse
  and would scramble multi-sibling text; e.g. a date split across `text("4. ")`, a `link` node
  wrapping `text("Juli")`, and `text(" 2026")` must join as `"4. Juli 2026"`, not a reordered
  string) simultaneously checks, in one pass: any node with `type === 'link'` or
  `type === 'autolink'` (Lexical's link/auto-link node types), and concatenates descendant `text`
  fields in source order. This is a new traversal, not a reuse of `hasText`'s algorithm — only the
  "recurse into `children` when present" shape is shared with it.
- The single pass embeds its own inline `MAX_NODES_TO_SCAN` counter and `visited: Set<LexicalNode>`
  guard, structurally identical to `hasValidDescendants`'s (postContent.ts:72–99), but does NOT
  call `hasValidDescendants` itself — this stays one traversal, not a validity-gate-then-scan
  two-pass design. Required, not optional: this function runs on every client keystroke via
  `registerUpdateListener`, and an unguarded traversal over adversarial/cyclic input would hang the
  admin editor tab.
- The joined text matches a date-like pattern, checked against a single unbroken regex literal (no
  markdown line-wrapping when transcribed into code — build via `new RegExp([...].join('|'))` if
  it aids readability, but the source must be one continuous pattern to avoid transcription bugs).
  Each month name appears once in the alternation (not duplicated per DE/EN — several month
  spellings are identical in both languages):
  - Numeric DE format: `\b\d{1,2}\.\d{1,2}\.\d{2,4}\b` (e.g. `04.07.2026`). Accepted residual false
    positive: a leading `\b` only anchors at the start of a digit run, so `"1234.5.2026"` matches
    the trailing `"34.5.2026"` substring rather than requiring the whole run to be a 1–2 digit day.
    Not fixed — false positives are broadly accepted for this heuristic (see below).
  - ISO format: `\b\d{4}-\d{2}-\d{2}\b` (e.g. `2026-07-04`)
  - Written format: `\d{1,2}\.?\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December)\s+\d{4}\b`
    (e.g. `4. Juli 2026`, `July 4, 2026`), case-insensitive. Deliberately no leading `\b` before the
    day-number or the month-name alternation — JS `\b` is ASCII-only and unreliable directly
    adjacent to `ä`/`ö`/`ü` (e.g. `März`); the preceding `\s+` before the year already provides an
    unambiguous boundary. (Adding a leading `\b` before `\d{1,2}` is not itself unsafe — digits are
    plain ASCII word characters — but is intentionally omitted for consistency with the other two
    patterns' accepted looseness, not because it would be wrong to add.)

False positives are broadly acceptable — this is a reminder, not a rejection. This heuristic will
also fire on unrelated numeric patterns common in this site's content (e.g. movement/opus
numbering like "1. Satz" in program notes); accepted as noise inherent to an advisory-only
heuristic.

`hasTrailingDateUrl` is a standalone export. It must NOT be folded into
`validatePostContentErrors`'s return array or `PostContentValidationError`'s type union — doing so
would leak it into `validatePublishedPostContent`'s blocking publish path. Keep it a separate
function with its own return type, called only from the client advisory plugin.

## Admin Feedback

- `PostContentWarningPlugin` (`src/features/postContentWarning/feature.client.tsx`) already runs
  `validatePostContentErrors` on every editor update and toggles a warning `Banner`. Extend it to
  also compute `hasTrailingDateUrl(value)` on the same editor-state JSON, tracked as its own
  boolean state (e.g. `hasDateUrlAdvisory`) — do NOT push a synthetic id into the `errors` array or
  `PostContentValidationError`'s union to make it "just work" with the existing `.map()`; that
  would recreate the exact advisory/blocking coupling this design forbids (see Detection Rule).
  Render it as one additional, unconditional `<li>` after the existing `errors.map(...)` list, using
  a fixed literal React key (e.g. `key="trailingDateUrl"`), only when `hasDateUrlAdvisory` is true.
- The existing `post-content-warning` class toggle and banner visibility logic currently key off
  `errors.length > 0`. Change that condition to `errors.length > 0 || hasDateUrlAdvisory` so the
  banner still appears when only the advisory condition is true (no structural errors).
- New message added to `postContentAdvisoryMessages`, a flat `Record<'de' | 'en', string>` pair
  (not a keyed dictionary like `postContentMessages` — there's only one advisory message today, so
  a keyed shape would be unnecessary abstraction). This is a deliberately different shape from
  `postContentMessages[locale][error]`'s two-level lookup; the client component indexes it as
  `postContentAdvisoryMessages[locale]` (one level) in the same render function, which is fine
  since the two dicts serve visibly different purposes (per-error-id lookup vs. a single flag):
  - `de`: "Bitte den EventDates-Block für einheitliche Darstellung verwenden."
  - `en`: "Please use the EventDates block for consistent styling."

## Implementation

- Add `hasTrailingDateUrl` and `postContentAdvisoryMessages` to `src/validators/postContent.ts`,
  reusing the existing `isNode`/`hasRoot` guards. The link/date traversal is new code (see
  Detection Rule for why it can't reuse `hasText`'s algorithm directly).
- Update `PostContentWarningPlugin` to call `hasTrailingDateUrl(value)` alongside
  `validatePostContentErrors(value)`, track it as a separate boolean, render it as an extra `<li>`
  (not merged into the `errors` array), and OR it into the class/visibility toggle condition.
- No changes to `Posts.ts`, `validatePostContent`, `validatePostContentErrors`, or
  `validatePublishedPostContent`.

## Testing

- Unit tests in `postContent.spec.ts` for `hasTrailingDateUrl`:
  - True for a final paragraph with a link node and each date format (numeric DE, ISO, written
    DE/EN).
  - True when the date text is split across sibling nodes around a link (e.g. `text("4. ")`,
    `link → text("Juli")`, `text(" 2026")`) — confirms order-preserving concatenation, not
    `hasText`-style reversed traversal.
  - False when there's a date but no link, a link but no date, neither, or the last node isn't a
    paragraph (e.g. an `EventDates` block already used correctly, including a preceding paragraph
    that looks date/link-like followed by a trailing `EventDates` block — confirms the "already
    converted correctly" case doesn't re-trigger the reminder).
  - False when the matching paragraph is not the last node: both (a) followed by an empty trailing
    paragraph, and (b) followed by a non-empty closing sentence (the Known Limitation scenario,
    e.g. "Wir freuen uns auf Sie.") — confirm behavior is based on the actual last node in both
    cases.
  - Malformed/adversarial input safety: `null`/`undefined`/non-object `value`, `root.children` not
    an array, and a self-referential/cyclic last node — must return `false` without hanging,
    exercising the required inline `MAX_NODES_TO_SCAN`/`visited`-Set guard.
- Locale completeness test mirroring the existing `postContentMessages` check: confirm
  `postContentAdvisoryMessages` defines both `de` and `en` text.
- Component test in `feature.client.spec.tsx`:
  - Banner shows the new advisory message when only the trailing date/URL condition is true (no
    structural errors), and confirms Save/Publish is unaffected (no changes needed to the blocking
    validator test suite).
  - Banner shows both a structural error and the advisory message together when both conditions
    are true (co-occurrence).

## Verification

- `pnpm lint`
- Targeted Vitest test files (`postContent.spec.ts`, `feature.client.spec.tsx`)
- `pnpm typecheck`

## Out Of Scope

- Blocking publish based on this condition.
- Scanning multiple trailing paragraphs (only the single last node is inspected).
- Auto-converting the detected line into an `EventDates` block (that's the existing
  `EventDatesConversionFeature`'s job, invoked manually by the editor).
- Detecting date/URL patterns anywhere other than the last top-level node.

## Known Limitation

- **Date/link line followed by trailing prose.** Because only the single last top-level node is
  inspected, a post structured as "... 4. Juli 2026, Yamagata [link]" followed by a further
  non-empty closing paragraph (e.g. "Wir freuen uns auf Sie.") will NOT trigger the reminder: the
  date/link paragraph is no longer the last node, and the actual last node (the closing sentence)
  isn't empty, so `emptyTrailingParagraph` doesn't nudge it into place either. This is the same
  post-242-style pattern the `EventDates` block was built for, so this is a real, silent miss —
  accepted as a narrow trade-off consistent with keeping the check simple and false-positive
  tolerant rather than scanning arbitrary trailing paragraph runs (see Out Of Scope). May be
  revisited if this gap proves common in practice.
</content>
