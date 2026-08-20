# Recording Details Modal — Design

## Summary

Add a brand-consistent details modal to the artist recordings tab. The recording row (`RecordingListItem`)
shows cover thumb, title, a "label • year" subtitle, and streaming icons. Two fields on the `Recording` model
are never surfaced anywhere: the rich-text **description** and the **roles** (soloist / conductor / etc.).
This feature exposes them via a shadcn Dialog opened from an inline **"More details"** link appended to the
row's "label • year" subtitle.

## Scope

- **In scope:** `RecordingListItem` (artist recordings tab) gets a "Details" link + modal. Only the artist
  recordings tab uses `RecordingListItem`.
- **Out of scope:** `RecordingCard` / `RecordingGrid` — `RecordingGrid` is orphaned (no imports besides its
  own spec / docs); leave untouched. No routing changes, no DB changes, no new dependencies.

## Approach

A self-contained client component `RecordingDetailsDialog.tsx` that owns open state and renders a shadcn
`Dialog`. `RecordingListItem` conditionally renders a "Details" trigger whenever a description exists.

**Why Dialog (not inline expand / not route page):**
- User requested a modal with shad-cn.
- Reuses the existing `@/components/ui/dialog` wrapper (already used by `ImageLightbox`), matching project
  patterns.
- No fetch needed: `getRecordingsByArtist` already queries with `depth: 2`, so `coverArt`, `artists`, and
  `description` arrive populated on the recording passed to the list.
- Self-contained → isolated, easily unit-tested.

## Data Source

`Recording` type (`src/payload-types.ts`):
- `title: string` — required
- `description` — rich text (Lexical `root`/`children`), nullable
- `recordingYear?: number | null`
- `recordingLabel?: string | null`
- `catalogNumber?: string | null`
- `coverArt?: (number | null) | Image`
- `spotifyURL?: string | null`
- `appleMusicURL?: string | null`
- `roles: ('soloist' | 'conductor' | 'ensemble_member' | 'chamber_musician' | 'accompanist')[]`

No new data fetching. The recording object already contains everything the modal needs.

## Trigger Behavior

- **Subtitle format:** the row subtitle becomes **`label • year`** (label and year only — catalog number is
  not shown on the row; it appears only inside the modal). An inline **"More details"** trigger link is
  appended to that subtitle, so the full line renders `label • year • More details`.
- **Condition:** the "More details" trigger renders **only** when the recording has *visible* description
  content. Because `description` is a Payload richText field, an empty block stores a **truthy object**
  (`{ root: { ..., children: [] } }`) with no visible text. Gating on object truthiness would render a
  "More details" link that opens an empty modal for empty-description recordings — worse than just showing
  `label • year`. **Fix:** a short helper (`hasVisibleTextContent`) walks `description.root.children` and
  returns true only if at least one node has non-whitespace `text`. This same helper drives both the
  trigger condition and the modal body. Without a visible description, the subtitle is just `label • year`.
  Rendering matrix:
  - description + label/year → `Label • 2020 • More details`
  - description only → `More details`
  - no description + label/year → `Label • 2020` (no link)
  - neither → no subtitle (`<p>` omitted)
- **Localization:** `description` is `localized: true` and recordings are fetched per-locale, so a recording
  may show "More details" in DE but not EN (or vice versa). This asymmetry is correct behavior per locale —
  not a bug. Compute the trigger from the current locale's populated `description`.
- **Style:** the "More details" trigger is a `<button>` (no `href` → not an `<a>`), styled as an inline
  muted link blending with the metadata line (`text-sm text-gray-500`) that darkens and gets a yellow
  underline on hover — consistent with the site's text-link pattern. It lives inline within the subtitle
  `<p>`, separated by ` • `.
- Streaming links (right side of the row) are unchanged.

## Modal Contents (`RecordingDetailsDialog`)

Layout: large cover art + heading + metadata, then rich-text description, then streaming links. White
surface, generous whitespace, hairline separation. `max-h` + internal scroll on the content region for long
descriptions.

- **Dialog title (a11y):** `DialogTitle` populated with the recording title. Users see a Playfair H3;
  Radix requires a title node for correct dialog semantics.
- **Cover art:** large `Next/Image` (or placeholder fallback mirroring the row's shared placeholder logic).
- **Roles:** an Inter overline-style label (uppercase, letter-spacing, silver) above the joined role list.
  Role **values** are rendered via the existing `useTranslations('custom.recordingRoles')` namespace (the same
  lookup the collection uses to label its select options) — do NOT duplicate role strings under
  `discography`. The overline label is shown only when `roles.length > 0` (roles can be `[]` even though
  required); otherwise the label + list are omitted.
- **Metadata:** year / label / catalog as Inter small silver text.
- **Description:** rendered via `PayloadRichText` (same component as `BiographyTab`) so rich text renders
  correctly. Cap prose at ~65ch (`max-w-prose` per DESIGN.md) for readability in a wide modal.
- **Streaming links:** Spotify + Apple Music text links reusing the existing "Listen on Spotify / Apple Music"
  translated labels and open-in-new-tab pattern.
- **Close:** default shadcn X button (already styled).
- **Open/close state:** follow `ImageLightbox` — track local `open` state; in `onOpenChange` only close
  (`(isOpen) => !isOpen && setOpen(false)`), never re-open from the handler.
- **Layout:** the shadcn `DialogContent` default is `max-w-lg`; a "large cover art" layout may need a wider
  override via `className` (e.g. `sm:max-w-2xl`). Apply `max-h` + internal scroll on the body for long
  descriptions.

## Brand Adherence

- Light theme only; white surface; hairline borders; 8px radius (shadcn default).
- Playfair for headings; Inter for body/meta; silver for meta/captions; yellow used only for accents
  (hover underlines / focus ring), never as a large surface fill.
- No gradients, glassmorphism, or gratuitous animation (shadcn's subtle dialog fade/zoom only).

## Accessibility

- Radix Dialog handles focus trap, Escape-to-close, and `aria-modal`. Keep `DialogTitle` populated.
- Streaming links keep `target="_blank"`, `rel="noopener noreferrer"`, and the `aria-label`
  `listenOnSpotifyFor` / `listenOnAppleMusicFor` with the existing `opensInNewTab` sr-only suffix.
- "Details" trigger is a real link/button (focusable, keyboard operable).

## Translations

Add keys to `src/i18n/de.ts` and `src/i18n/en.ts` under `custom.pages.artist.discography`:

- `details` — EN: "More details" / DE: "Mehr Details". Used as the inline row trigger link label.
- `roles` overline label — EN: "Roles" / DE: "Mitwirkung". Shown above the joined role list only when
  `roles.length > 0`. (Role *values* reuse the existing `custom.recordingRoles` namespace — no new role keys.)
- Streaming labels already exist: `listenOnSpotify`, `listenOnAppleMusic`, `opensInNewTab`. No change.

## Rich-Text Content Helper

Add a small `hasVisibleTextContent(description)` helper (shared by the trigger condition and the modal body) that
returns true only when `description?.root?.children` contains at least one node with non-whitespace `text`.
Prefix the helper with `function`, give it a return-type annotation, and place it in `src/utils/lexical.ts`
alongside the other lexical helpers (it is used independently by both `RecordingDetailsDialog` and
`RecordingListItem`).

## Testing

- New `RecordingDetailsDialog.spec.tsx`: renders all fields (title, roles via `custom.recordingRoles`, metadata,
  description text, streaming links); renders placeholder when no cover art; accessibility (visible title node
  present); hides roles label when `roles` is empty; renders an empty-state body (no description content) when
  `hasVisibleTextContent` returns false.
- Update `RecordingListItem.spec.tsx`: existing tests unaffected; add cases asserting (a) the "Details" trigger
  renders when the description has visible text, and (b) the trigger is absent when description is `null`,
  empty-object, or whitespace-only.
- Follow the mock/structure style of `ImageLightbox.spec.tsx` / `RecordingCard.spec.tsx` (mock the
  `custom.recordingRoles` translation via the standard `next-intl` test wrapper used across the suite).

## Out of Scope / Non-Goals

- No changes to `RecordingCard`, `RecordingGrid`, or any non-artist-tab surface.
- No API/data changes; no new libraries.
- No link from modal to individual recording pages (none exist).
- **Known product gap (accepted):** a recording with `roles` but no visible `description` gets no Details
  trigger, so its roles remain unexposed. This is a deliberate decision (description is the justification for
  the modal); revisit only if roles-only detail display is requested later.
- **Cover art sizes nuance:** the modal cover uses full-res `getValidImageUrl(image.url)` (prefer full-res in
  a large modal). If a record has only a `sizes` entry and no top-level `url`, the modal falls back to the
  placeholder while the row may still show a thumbnail — accepted divergence; reuse `sizes` fallback if it
  proves common.
