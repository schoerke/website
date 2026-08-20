# Recording Details Modal — Design

## Summary

Add a brand-consistent details modal to the artist recordings tab. Currently a recording row
(`RecordingListItem`) shows only cover thumb, title, "label • catalog • year" subtitle, and streaming
icons. Two fields on the `Recording` model are never surfaced anywhere: the rich-text **description**
and the **roles** (soloist / conductor / etc.). This feature exposes them via a shadcn Dialog opened from
a per-row **"Details"** link.

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

- **Condition:** the "Details" trigger renders **only** when `recording.description` is truthy (present).
  Rationale: the description is the primary hidden content the modal adds value with; roles/metadata alone
  don't justify an overlay. If no description, the row renders exactly as today.
- **Style:** a compact text link on the right of the row (matching existing interaction language instead of a
  heavy button). Follows the site's text-link pattern — raisin-black text, yellow underline on hover, silver
  muted when idle. Place inline with / near the existing streaming links so the row stays visually balanced.
- All existing row content (cover, title, subtitle, streaming) is unchanged.

## Modal Contents (`RecordingDetailsDialog`)

Layout: large cover art + heading + metadata, then rich-text description, then streaming links. White
surface, generous whitespace, hairline separation. `max-h` + internal scroll on the content region for long
descriptions.

- **Dialog title (a11y):** `DialogTitle` populated with the recording title. Users see a Playfair H3;
  Radix requires a title node for correct dialog semantics.
- **Cover art:** large `Next/Image` (or placeholder fallback mirroring the row's shared placeholder logic).
- **Roles:** Inter overline-style small text (uppercase, letter-spacing, silver) — e.g. "Soloist • Conductor".
- **Metadata:** year / label / catalog as Inter small silver text.
- **Description:** rendered via `PayloadRichText` (same component as `BiographyTab`) so rich text renders
  correctly.
- **Streaming links:** Spotify + Apple Music text links reusing the existing "Listen on Spotify / Apple Music"
  translated labels and open-in-new-tab pattern.
- **Close:** default shadcn X button (already styled).

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

- `details` — EN: "Details" / DE: "Details"
- `roles` — EN: "Roles" / DE: "Mitwirkung". Rendered as an overline label above the joined role list when
  the recording has roles; the label is omitted when roles are absent.
- Streaming labels already exist: `listenOnSpotify`, `listenOnAppleMusic`, `opensInNewTab`. No change.

## Testing

- New `RecordingDetailsDialog.spec.tsx`: renders all fields (title, roles, metadata, description text,
  streaming links); renders placeholder when no cover art; accessibility (visible title node present).
- Update `RecordingListItem.spec.tsx`: existing tests unaffected; add cases asserting the "Details" trigger
  renders when a description is present and is absent when description is missing.
- Follow the mock/structure style of `ImageLightbox.spec.tsx` / `RecordingCard.spec.tsx`.

## Out of Scope / Non-Goals

- No changes to `RecordingCard`, `RecordingGrid`, or any non-artist-tab surface.
- No API/data changes; no new libraries.
- No link from modal to individual recording pages (none exist).
