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

### Out of scope for this change

- Home page news feed / any other list already goes through `getFilteredPosts`/`getPaginatedPosts`
  — covered by the default-exclude behavior above.

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
of the three) but only checks that the value is a syntactically valid URL — no extension or host
allowlist. `AudioEmbedBlockFields` interface in `AudioEmbed.ts` gains `fileUrl?: string`.

### Dropbox auto-convert

New pure function in `src/utils/audio.ts`:

```ts
export function normalizeAudioFileUrl(value: string): string
```

- Recognizes `https://www.dropbox.com/...` share links.
- Rewrites to the direct-stream form by forcing `dl=1` (replacing `dl=0` or appending `dl=1` if
  the query param is absent), which serves the raw file instead of Dropbox's preview page.
- Any URL that isn't a `dropbox.com` share link passes through unchanged.

Wired in as a `beforeChange` hook on the `fileUrl` field (via `hooks.beforeChange`, following the
existing pattern used elsewhere in this file, e.g. `normalizedTitle`), so the stored value is
already the playable form — admins can paste a normal Dropbox share link as-is.

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

## Testing

- `Posts.test.ts`: unlisted default false; posts with `unlisted: true` excluded from
  `getFilteredPosts`/`getPaginatedPosts` by default, included when `includeUnlisted: true`.
- `sitemap.spec.ts`: unlisted post excluded from generated sitemap entries.
- `audioFields` validator spec: `validateFileURL` accepts a plain URL, rejects malformed input,
  allows empty when a sibling field is set.
- `audio.spec.ts` (new): `normalizeAudioFileUrl` converts `dl=0` → `dl=1`, adds `dl=1` when
  missing, leaves non-Dropbox URLs untouched.
- `AudioEmbed.spec.tsx`: new `fileUrl` branch renders an `<audio>` element with the given `src`.
