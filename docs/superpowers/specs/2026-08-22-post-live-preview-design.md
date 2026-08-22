# Post Live Preview Design

Status: Approved
Date: 2026-08-22

## Problem

Content editors need to preview draft posts before publishing. Payload offers two
preview mechanisms:

- **Preview** (`admin.preview`): a button that opens a URL in a new tab. Static —
  the editor must reload to see changes.
- **Live Preview** (`admin.livePreview`): embeds the front-end in an iframe inside
  the admin edit view and pushes field updates in real time as the editor types.

This spec adds **Full Live Preview** (iframe + `useLivePreview` hook) for the Posts
collection.

## Requirements

- Real-time preview of draft posts embedded in the Payload admin edit view.
- Public post pages (`/[locale]/news/[slug]`, `/[locale]/projects/[slug]`) remain
  statically generated. No per-request database reads for public traffic.
- Draft content is only readable when authenticated and authorized (never on the
  public site).
- Works on Vercel with the existing same-origin admin + frontend setup.
- Localized preview: the preview iframe shows the locale currently being edited.

## Non-goals

- Preview for other collections (artists, pages, etc.) — Posts only.
- Content editing inside the preview iframe.
- Cross-origin support (admin and front-end are the same Next.js app).

## Architecture

### Overview

```
Admin edit view (post)
  └─ iframe loads /api/preview?path=/de/preview/foo&previewSecret=...&collection=posts
       └─ /api/preview route (GET)
            ├─ verify previewSecret === PREVIEW_SECRET            → 403 on mismatch
            ├─ verify session via payload.auth()                  → 403 on no user
            ├─ validate path is relative (starts with "/")        → 400 otherwise
            ├─ draftMode().enable()
            └─ redirect(path)
                 └─ /de/preview/foo (dynamic, async server component)
                      ├─ getPostBySlug(slug, locale, { draft: true })
                      └─ renders <PostPreviewClient initialData={post}>
                           └─ useLivePreview({ initialData, serverURL, depth: 1 })
                                └─ renders <PostDetailContent .../> with live data
```

### Routing

| Route | Rendering | Data source |
|---|---|---|
| `/[locale]/news/[slug]` | static (unchanged) | published only |
| `/[locale]/projects/[slug]` | static (unchanged) | published only |
| `/[locale]/preview/[slug]` | **dynamic (new)** | draft + published |
| `/api/preview` | route handler (new) | — |

The preview route lives inside the `[locale]` segment so it inherits the
`NextIntlClientProvider` layout and `setRequestLocale` (`next-intl`) without
duplication.

### Components

**`src/app/api/preview/route.ts`** (new, GET)

- Params: `path`, `previewSecret`, `collection`.
- Returns `403` for: wrong `previewSecret`, unauthenticated session.
- Returns `400` for: missing `path` or non-relative `path`.
- On success: `draftMode().enable()`, `redirect(path)`.
- `collection` param reserved for future multi-collection use; not strictly
  validated for posts.

**`src/app/(frontend)/[locale]/preview/[slug]/page.tsx`** (new, async server
component)

- `validateLocale(rawLocale)`, `setRequestLocale(locale)`.
- `getPostBySlug(slug, locale, { draft: true })`; `notFound()` if missing.
- Resolves `getTranslations` for the post detail labels (`custom.pages.news`).
- Renders `<PostPreviewClient …/>`.

**`src/components/Post/PostPreviewClient.tsx`** (new, `'use client'`)

- Props: the full `Post` (`initialData`), `locale`, plus the translated labels
  currently passed to `PostDetailContent`.
- `useLivePreview<Post>({ initialData, serverURL: NEXT_PUBLIC_SERVER_URL, depth: 1 })`.
- Derives same props as the static pages: `title`, `content`, `createdAt`,
  `imageUrl = getValidImageUrl(data.image)`, `relatedArtists = getRelatedArtists(data.artists)`.
- Renders `<PostDetailContent …/>`. Projects-specific flags (`showDate={false}`
  etc.) are not needed — the preview route is category-agnostic and shows the date.

### Collection config changes

**`src/collections/Posts.ts`**

```ts
admin: {
  livePreview: {
    url: ({ data, req }) => generatePreviewPath({ data, req, collection: 'posts' }),
  },
  preview: (data, { req }) => generatePreviewPath({ data, req, collection: 'posts' }),
},
```

**`src/utils/preview/url.ts`** (new)

`generatePreviewPath` builds:

```
`${NEXT_PUBLIC_SERVER_URL}/api/preview?path=/${req.locale}/preview/${encodeURIComponent(data.slug)}&previewSecret=${PREVIEW_SECRET}&collection=posts`
```

- `req.locale` is the locale currently being edited.
- Falls back to `'de'` if `req.locale` is missing.
- Guards `data.slug`; returns `undefined` when no slug.

### Service changes

**`src/services/post.ts`** — `getPostBySlug` gains an options param:

```ts
export const getPostBySlug = async (
  slug: string,
  locale: LocaleCode = 'de',
  options: { draft?: boolean } = {}
) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    locale,
    depth: 1,
    draft: options.draft === true,   // returns latest version incl. drafts
  })
  // …
}
```

When `draft: true`, Payload returns the latest version of the doc (draft or
published) and `_status` is not filtered. `getFilteredPosts` / `getPaginatedPosts`
are unchanged — the static pages keep their `_status: 'published'` filter.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `PREVIEW_SECRET` | yes | New secret. Shared between `url.ts` and the `/api/preview` route. Set in local `.env` **and** Vercel. |
| `NEXT_PUBLIC_SERVER_URL` | already present | iframe target base + `useLivePreview` `serverURL`. |

> Credential policy: `PREVIEW_SECRET` is a new credential. The user must either
> provide a value or explicitly approve generating one before implementation.

### Dependency

- `@payloadcms/live-preview` — provides the `useLivePreview` client hook.
  Requires explicit user approval to install.

### Error handling

- `/api/preview`: `403` no/incorrect secret, `403` unauthenticated, `400` missing /
  non-relative path.
- Unknown slug in preview route → `notFound()` (404), rendered inside the iframe.
- `/api/preview` failures appear in the iframe, not the admin UI.
- `useLivePreview` failure modes: the hook silently keeps `initialData` if no
  message arrives, so the iframe still renders the draft fetched server-side.

### Static generation preservation

- Neither `news/[slug]` nor `projects/[slug]` read `draftMode()`, so they remain
  statically generated. Public traffic keeps hitting the edge cache — no
  per-request Turso reads.
- The preview route is the only post-related dynamic route. Its reads are limited
  to editor sessions (iframe load + save/autosave reloads). `useLivePreview`
  pushes field diffs via `postMessage` and does not refetch per keystroke.

### Security

- Draft content never exposed via the public static routes — they filter
  `_status: 'published'` and don't know about drafts.
- The `/api/preview` route gates on `PREVIEW_SECRET` + authenticated Payload
  session. The secret is checked server-side; the iframe still requires the
  admin's session cookie (same-origin) to read draft data.

## Testing

1. **`/api/preview` route handler** (`src/app/api/preview/route.test.ts`):
   - wrong `previewSecret` → 403
   - missing `path` → 400
   - relative-path guard: `//evil.com` → 400
   - authenticated + valid secret → redirect + draft cookie set
2. **`getPostBySlug`** (`src/services/post.test.ts` or existing pattern):
   - default → filters `_status: 'published'`
   - `{ draft: true }` → passes `draft: true`, no `_status` filter
3. **`PostPreviewClient`** (`src/components/Post/PostPreviewClient.test.tsx`):
   - mock `useLivePreview`
   - renders `initialData`; re-renders when hook data changes
   - `getValidImageUrl` / `getRelatedArtists` mapping
4. **URL generator** (`src/utils/preview/url.test.ts`):
   - builds `/api/preview` URL with `path`, slug, locale, secret
   - no slug → `undefined`
   - missing locale → fallback `'de'`

## Migration / Data impact

None. No schema changes, no data migration, no database writes.

## Manual verification checklist

1. Start local dev; confirm `.env` has `PREVIEW_SECRET`.
2. Edit a post in admin → Live Preview tab opens iframe at `/de/preview/<slug>`.
3. Type in the editor → preview title/body updates without reload.
4. Change admin locale to `en` → preview URL uses `/en/preview/<slug>`.
5. Publish the post → public `/de/news/<slug>` renders and is statically cached.
6. Hit `/api/preview` with wrong secret → 403.
7. Run `pnpm test`, `pnpm lint`, `pnpm build`.

## Open questions / risks

- None blocking. Final approvals pending: `PREVIEW_SECRET` creation and
  `@payloadcms/live-preview` install.
- Minor: preview iframe shows the post content component only (no site header /
  nav chrome), since the preview route bypasses the public layout ornaments around
  it. Accepted for now.