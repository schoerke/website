# Unlisted Posts + Direct Audio File Playback

Date: 2026-09-27

## Problem

Client wants to publish a "private" post embedding an MP3 (radio broadcast recording) hosted on
Dropbox. Two needs:

1. A post that's live/reachable but not publicly discoverable — shareable via direct link only,
   excluded from news/projects listings, sitemap, and on-site search.
2. Play a direct audio file URL (not necessarily MP3 — could be any audio format) inline with a
   simple player, without building file upload support.

## Non-goals

- No new upload/media collection for audio files — still a URL string, hosted externally (Dropbox
  for now, but the field should not assume Dropbox).
- No password gate — "unlisted" (obscurity via URL) is sufficient per client's stated need.
- No changes to the search plugin — Posts are already not indexed there (only
  artists/employees/pages/repertoire are).

## Accepted risk: Payload's generic REST/GraphQL API

All `unlisted` filtering in this spec (`getFilteredPosts`, `getPaginatedPosts`, sitemap,
`getArtistBySlug`) happens at the service-function query-builder level, not at Payload's `access`
level. `authenticatedOrPublished` (the Posts `read` access) only checks `_status`, so Payload's
generic REST (`/api/posts`) and GraphQL endpoints will still list unlisted posts to an anonymous
caller who queries them directly — `robots.txt` disallows `/api` for crawlers, but that doesn't
stop a direct fetch by someone who knows to look. This is accepted as out of scope: the client's
requirement is "not listed anywhere on the site," not "cryptographically inaccessible," and
building custom `access` logic to hide documents from generic list queries while still allowing
individual by-slug reads is materially more complex than this feature warrants. If stronger
guarantees are needed later, revisit with a dedicated access-control design.

## Part 1: Unlisted posts

### Field

Add a new field to `src/collections/Posts.ts`:

```ts
{
  name: 'unlisted',
  type: 'checkbox',
  defaultValue: false,
  label: { de: 'Nicht gelistet', en: 'Unlisted' },
  admin: {
    position: 'sidebar',
    description: {
      en: 'Hide from news/projects listings, sitemap, and search. Still viewable via direct link.',
      de: 'Aus News-/Projektlisten, Sitemap und Suche ausblenden. Über Direktlink weiterhin sichtbar.',
    },
  },
},
```

Add `unlisted` to `admin.defaultColumns` in the Posts config so staff can see it in the list view.

### Filtering

`src/services/post.ts`:

- `getFilteredPosts` and `getPaginatedPosts` gain a new option `includeUnlisted?: boolean`
  (default `false`, mirrors the existing `publishedOnly` pattern). When not explicitly `true`, add
  `where.unlisted = { not_equals: true }`.
- `getPostBySlug` is **unchanged** — it fetches by slug directly and doesn't filter by
  `unlisted`, so a direct link to an unlisted post continues to resolve normally.

`src/app/sitemap.ts`:

- Add `unlisted: { not_equals: true }` to both the `news` and `projects` `where` clauses in
  `getEntriesForLocale`.

### Static generation

`generateStaticParams` in `.../news/[slug]/page.tsx` and `.../projects/[slug]/page.tsx` call
`getFilteredPosts(..., publishedOnly: true)`, which will now also exclude unlisted posts by
default (no code change needed there — just relying on the new default). Since neither page sets
`export const dynamicParams = false`, Next.js will render the unlisted post on-demand on first
request instead of at build time. No other change required.

### Artist "Projects" tab leak (must fix)

`getArtistBySlug` (`src/services/artist.ts`) populates `artist.projects` from the denormalized
`projects` relationship array (kept in sync by `syncArtistProjects.ts`'s `afterChange` hook on
Posts), filtering only on `project._status === 'published'`. It does not go through
`getFilteredPosts`/`getPaginatedPosts`, so an unlisted `projects`-category post currently would
still render on its linked artist's public "Projects" tab (`ArtistTabs.tsx`) with title, image,
and a direct link — defeating the whole point of "excluded from listings."

Fix: add `project.unlisted !== true` to `getArtistBySlug`'s existing filter, alongside the
`_status` check, so unlisted posts are dropped from the artist-page projects list the same way
unpublished ones are.

### Artist "News" tab visibility bug (must fix)

`getNewsPostCountByArtist` (`src/services/post.ts`) is used solely to compute `hasNews` on the
artist detail page (`.../artists/[slug]/page.tsx`), which decides whether the "News" tab renders
at all. It filters on `_status` and `artists`/`categories` but not `unlisted`, while the tab's
actual content (loaded lazily via `fetchPostsByArtist` → `getFilteredPosts`, already filtered)
does exclude unlisted posts. Net effect: if an artist's only news post is unlisted, the tab shows
up as available but renders empty when clicked — not a data leak, but a confusing dead-end. Fix:
add `unlisted: { not_equals: true }` to `getNewsPostCountByArtist`'s `where` clause so the count
and the tab's actual content agree.

Audit of every other `payload.find`/`payload.count` call on the `posts` collection
(`getAllPosts`, `getAllNewsPosts`, `getAllProjectPosts`, `getAllHomepagePosts`,
`getAllNewsPostsByArtist`, `getAllProjectPostsByArtist` in `src/services/post.ts`) confirms these
are all dead code — deprecated, unused outside their own file and tests — so no further fix
needed there. If any are revived later, they'll need the same `unlisted` exclusion.

### Out of scope for this change

- Home page news feed / any other list already goes through `getFilteredPosts`/`getPaginatedPosts`
  — covered by the default-exclude behavior above.
- Existing `revalidatePostOnChange` (`afterChange` hook) already revalidates the post's own page
  and the news/projects list pages on any field change, including toggling `unlisted` — no new
  revalidation wiring needed.

## Part 2: Direct audio file playback

### Field

Extend the existing `AudioEmbed` block (`src/blocks/AudioEmbed.ts`) with a third mutually
exclusive field, `fileUrl`:

```ts
{
  name: 'fileUrl',
  type: 'text',
  required: false,
  label: { en: 'Audio File URL', de: 'Audio-Datei-URL' },
  admin: {
    placeholder: 'https://www.dropbox.com/s/.../recording.mp3?dl=0',
    description: {
      en: 'Direct link to an audio file (e.g. Dropbox share link). Plays with a simple audio player. Leave the other two fields empty when using this.',
      de: 'Direktlink zu einer Audiodatei (z. B. Dropbox-Freigabelink). Wird mit einem einfachen Audioplayer abgespielt. Die anderen beiden Felder bei Verwendung leer lassen.',
    },
    condition: (_, siblingData) => !siblingData?.url && !siblingData?.embedCode,
  },
  validate: validateFileURL,
},
```

Existing `url` and `embedCode` admin `condition`s get extended to also hide when `fileUrl` is set,
keeping all three mutually exclusive in the UI (matches the existing two-field pattern).

### Validation

`src/validators/audioFields.ts` gains `validateFileURL`: same shape as `validateAudioURL` /
`validateEmbedCode` (empty allowed if either sibling field is set; otherwise requires at least one
of the three) — checks the value is a syntactically valid URL **and** that `url.protocol ===
'https:'** (same explicit scheme check `validateEmbedCode` already does). No extension or host
allowlist beyond that. The scheme check matters because `new URL('javascript:...')` and
`new URL('data:...')` both parse successfully, and this value flows straight into `<audio src>` —
restricting to `https:` closes that off without needing a host allowlist.
`AudioEmbedBlockFields` interface in `AudioEmbed.ts` gains `fileUrl?: string`.

**Three-field data integrity:** admin `condition`s are UI-only (same class of gap as the `maxRows`
footgun noted in `docs/patterns/payload.md`) — they hide fields but don't stop more than one of
`url`/`embedCode`/`fileUrl` from being non-empty on the stored document (e.g. via API, a bad
migration, or manual DB edit). If that happens, all three `condition`s would evaluate to "hide"
simultaneously, leaving no way to see/clear the unwanted field in the admin UI. `validateFileURL`
(and the existing two validators) should also enforce a hard rule beyond "empty is OK when a
sibling is set" — reject the save if **more than one** of the three fields is non-empty, so this
state can't be persisted in the first place. Each field's own error message should name the
specific conflicting sibling (e.g. "Clear the Embed Code field first") rather than a generic
message, since if two fields end up simultaneously set, both validators will fire independently
and the admin needs to know which to clear.

### Dropbox auto-convert

New pure function in `src/utils/audio.ts`:

```ts
export function normalizeAudioFileUrl(value: string): string
```

- Matches `dropbox.com` hosts (`www.dropbox.com` and bare `dropbox.com`) for both known Dropbox
  share URL shapes: legacy `/s/.../file.ext?...&dl=0` and the current `/scl/fi/...?rlkey=...&dl=0`
  format.
- Uses `URL`/`URLSearchParams` to parse and rewrite the query string (not a naive string
  `replace`), so it correctly handles: no query string at all (append `?dl=1`), other existing
  params like `rlkey=...` (preserve them, only touch `dl`), and `dl=0` already present (set to
  `1`).
- Already-direct links (`dl.dropboxusercontent.com`, or any non-`dropbox.com` host) pass through
  unchanged — the function only rewrites when the host matches `dropbox.com`/`www.dropbox.com`.
- Defensive: if the input isn't a parseable URL at all, return it unchanged rather than throwing
  (this function may run on values that already passed validation, but should not assume that as
  its only caller forever).

Wired in as a `beforeChange` hook on the `fileUrl` field (via `hooks.beforeChange`, following the
existing pattern used elsewhere in this file, e.g. `normalizedTitle`), so the stored value is
already the playable form — admins can paste a normal Dropbox share link as-is. Payload's field
lifecycle runs `beforeValidate → validate → beforeChange`, so `validateFileURL` always validates
the raw pasted URL (before normalization), and the normalized value is only what gets persisted —
no reordering needed, but noted here since it's not obvious from the hook name alone.

### Frontend rendering

`src/components/blocks/AudioEmbed.tsx` gains a `fileUrl` prop and a new branch (checked before the
existing `embedCode`/`url` branches, since it's the simplest case):

```tsx
if (fileUrl) {
  return (
    <div className="my-8">
      <audio controls className="w-full" src={fileUrl}>
        <a href={fileUrl}>Download audio</a>
      </audio>
    </div>
  )
}
```

No iframe, no host allowlist, no sandboxing needed — it's a native browser element pointed at a
direct file URL. Falls back to a plain link inside the `<audio>` tag for browsers that don't
support the element or the file's codec.

A third file also needs updating: `src/components/ui/PayloadRichText.tsx`'s Lexical block
converter (the `audioEmbed` case, ~line 183) currently destructures only `url` and `embedCode` off
`node.fields` and passes them to `<AudioEmbed>` — it must also pass through `fileUrl`, or the new
field will be silently dropped between the block config and the rendered component.

## Migration

New fields (`unlisted` checkbox on Posts, `fileUrl` text on the `AudioEmbed` block) require a
Payload migration for prod per `docs/patterns/payload.md` — dev schema push (`ALTER TABLE`) is not
sufficient/safe for the deployed database. Generate with `pnpm payload migrate:create`, review the
generated `up()`/`down()`, and add the standard idempotency guard (`alreadyApplied()` check) since
`build:ci` re-runs migrations on every build including previews.

Note: `docs/superpowers/specs/2026-09-20-scheduled-post-publishing-design.md` also touches the
Posts schema (adds `publishedAt` to versions) and hadn't generated its migration as of this spec's
writing. Different columns, no real conflict, but whichever feature implements first should run
`migrate:create` and commit that migration before the other starts, so neither generates a
migration against a stale view of "current schema."

## Testing

- `Posts.test.ts`: unlisted default false; posts with `unlisted: true` excluded from
  `getFilteredPosts`/`getPaginatedPosts` by default, included when `includeUnlisted: true`;
  `getPostBySlug` explicitly still returns an unlisted post unfiltered (this is the crux of the
  "unlisted, not private" design and should have its own assertion, not just be implied by "no
  change").
- `artist.spec.ts` (or wherever `getArtistBySlug` is tested): unlisted project post excluded from
  `artist.projects`.
- `post.spec.ts`: `getNewsPostCountByArtist` excludes unlisted posts from its count.
- `sitemap.spec.ts`: unlisted post excluded from generated sitemap entries.
- `audioFields` validator spec: `validateFileURL` accepts a valid `https:` URL, rejects
  non-`https:` schemes (`javascript:`, `data:`, `http:` if excluded), rejects malformed input,
  allows empty when a sibling field is set, rejects a save where more than one of
  `url`/`embedCode`/`fileUrl` is non-empty.
- `audio.spec.ts` (new): `normalizeAudioFileUrl` — table of cases covering `/s/...?dl=0` →
  `dl=1`, `/scl/fi/...?rlkey=abc&dl=0` → `rlkey=abc&dl=1` (params preserved), no query string →
  `dl=1` appended, bare `dropbox.com` host, `dl.dropboxusercontent.com` and non-Dropbox URLs left
  unchanged, malformed input returned as-is.
- `AudioEmbed.spec.tsx`: new `fileUrl` branch renders an `<audio>` element with the given `src`.
