# Artist Tab Conditional Visibility

**Date:** 2026-05-25
**Status:** Approved

## Problem

The artist detail page always shows all 6 tabs (Biography, Repertoire, Discography, Media, News, Projects) regardless of whether the artist has any content for them. The client wants News and Projects tabs hidden when the artist has no associated content.

## Scope

- Hide **News** tab when the artist has zero published news posts
- Hide **Projects** tab when the artist has zero associated projects
- Consistent logic for both tabs
- No change to other tabs (Biography, Repertoire, Discography, Media)

## Data Sources

**Projects:** Already available. `artist.projects` is a relationship field on the Artist document, populated at `depth: 1` in `getArtistBySlug`. Count = `(artist.projects || []).filter(p => typeof p === 'object').length`. No extra query needed.

**News:** Not on the artist document. News posts live in the `posts` collection with `posts.artists` pointing back to the artist. Count requires a `payload.count()` query: `{ collection: 'posts', where: { artists: { equals: artistId }, categories: { contains: 'news-id' }, _status: { equals: 'published' } } }`.

## Architecture

### 1. New service function — `src/services/post.ts`

```ts
export async function getNewsPostCountByArtist(artistId: number, locale: 'de' | 'en'): Promise<number>
```

- Uses `payload.count()` (lightweight — no document data fetched)
- Filters: `artists equals artistId`, `_status equals 'published'`, category = news
- Returns count as number

### 2. Artist page — `src/app/(frontend)/[locale]/artists/[slug]/page.tsx`

Run both queries in parallel via `Promise.all`:

```ts
const [artist, newsCount] = await Promise.all([
  getArtistBySlug(slug, locale),
  getNewsPostCountByArtist(artistId, locale), // artistId from artist after first resolve
])
```

Wait — `artistId` is needed for the count, but comes from `getArtistBySlug`. So sequential is required for news count. However, projects are free (from artist object). Structure:

```ts
const artist = await getArtistBySlug(slug, locale)
if (!artist) return notFound()

const newsCount = await getNewsPostCountByArtist(artist.id, locale as 'de' | 'en')

const hasNews = newsCount > 0
const hasProjects = (artist.projects || []).filter(p => typeof p === 'object').length > 0
```

Pass `hasNews` and `hasProjects` as props to `<ArtistTabs>`.

### 3. ArtistTabs — `src/components/Artist/ArtistTabs.tsx`

Add props:

```ts
interface ArtistTabsProps {
  artist: Artist
  locale: string
  hasNews: boolean
  hasProjects: boolean
}
```

Filter `tabs` array:

```ts
const tabs: TabId[] = (
  ['biography', 'repertoire', 'discography', 'media', 'news', 'projects'] as TabId[]
).filter(tab => {
  if (tab === 'news') return hasNews
  if (tab === 'projects') return hasProjects
  return true
})
```

### 4. Hash navigation guard

In the `useEffect` that reads the URL hash, only set the tab if it exists in the filtered `tabs` array:

```ts
} else if (tabs.includes(hash as TabId)) {
  setActiveTab(hash as TabId)
}
```

This already exists — no change needed. The guard is already `tabs.includes(hash as TabId)`, so if `news` or `projects` is not in `tabs`, the hash is ignored and the default `biography` tab is shown.

## Testing

### `src/services/post.ts`
- `getNewsPostCountByArtist` returns correct count from Payload
- Returns 0 when no posts match

### `src/components/Artist/ArtistTabs.spec.tsx`
- News tab hidden when `hasNews=false`
- News tab visible when `hasNews=true`
- Projects tab hidden when `hasProjects=false`
- Projects tab visible when `hasProjects=true`
- Both hidden simultaneously
- Hash pointing to hidden tab falls back to biography (hash `#news` with `hasNews=false`)

### `src/app/(frontend)/[locale]/artists/[slug]/page.tsx`
- `getNewsPostCountByArtist` called with correct artist id
- `hasNews` / `hasProjects` props passed to `ArtistTabs`

## Files Changed

| File | Change |
|---|---|
| `src/services/post.ts` | Add `getNewsPostCountByArtist` |
| `src/app/(frontend)/[locale]/artists/[slug]/page.tsx` | Fetch news count, compute booleans, pass to ArtistTabs |
| `src/components/Artist/ArtistTabs.tsx` | Add `hasNews`/`hasProjects` props, filter tabs array |
| `src/services/post.spec.ts` (or new) | Tests for new service function |
| `src/components/Artist/ArtistTabs.spec.tsx` | Tests for conditional tab visibility |
