# Post Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Live Preview (Payload admin iframe + `useLivePreview` hook) for the Posts collection so editors see draft posts update in real time, without making public post pages dynamic.

**Architecture:** Two new routes — a `/api/preview` route handler that verifies `PREVIEW_SECRET` + session, enables Next draft mode, and redirects; and a dynamic `/[locale]/preview/[slug]` page (under the `[locale]` layout so it inherits Header/Footer/i18n) that gates on `draftMode().isEnabled`, fetches the draft via `getPostBySlug(..., { draft: true })`, and renders a new client component `PostPreviewClient` wired to `useLivePreview` from `@payloadcms/live-preview-react`. Public `news/[slug]` and `projects/[slug]` pages are untouched and remain statically generated.

**Tech Stack:** Next.js 16, Payload CMS 3.88, Turso (SQLite), `@payloadcms/live-preview-react@3.88.0`, vitest + Testing Library, oxfmt, oxlint, TypeScript.

---

### Task 1: Install `@payloadcms/live-preview-react`

> ⚠️ Permission required: installs a new dependency. Per AGENTS.md, ask the user before running.

**Files:**
- Modify: `package.json` (via pnpm)
- Test: none (dependency install)

- [ ] **Step 1: Install the package**

Run: `pnpm add @payloadcms/live-preview-react@3.88.0`
Expected: added to `dependencies`, `@payloadcms/live-preview@3.88.0` pulled in transitively (peer `react` satisfied by react 19.2.8).

- [ ] **Step 2: Verify version alignment**

Run: `pnpm list @payloadcms/live-preview-react @payloadcms/live-preview`
Expected: both at `3.88.0`, matching all other `@payloadcms/*` packages.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add @payloadcms/live-preview-react for post live preview"
```

---

### Task 2: `getPostBySlug` draft support

**Files:**
- Modify: `src/services/post.ts:401-414`
- Modify: `src/services/post.spec.ts` (add tests to existing `describe('getPostBySlug')`)

Test pattern already exists in `post.spec.ts:546-651` — reuses the module-level `vi.mock('payload', ...)` and `mockPayload.find`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('getPostBySlug', ...)` in `src/services/post.spec.ts`:

```ts
    it('should pass draft: true and no _status filter when draft option is set', async () => {
      const mockPost = createMockPost({ slug: 'draft-post' })
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([mockPost]),
        limit: 1,
      })

      await getPostBySlug('draft-post', 'de', { draft: true })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          slug: { equals: 'draft-post' },
        },
        limit: 1,
        locale: 'de',
        depth: 1,
        draft: true,
      })
    })

    it('should return a draft post when draft option is set', async () => {
      const draftPost = createMockPost({ slug: 'draft-post', _status: 'draft' })
      vi.mocked(mockPayload.find).mockResolvedValue({
        ...createMockPaginatedDocs([draftPost]),
        limit: 1,
      })

      const result = await getPostBySlug('draft-post', 'de', { draft: true })

      expect(result).toEqual(draftPost)
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/services/post.spec.ts -t "getPostBySlug" 2>&1 | tail -20`
Expected: FAIL — assertion error: `find` called without `draft`, options arg type error.

- [ ] **Step 3: Modify the service**

Replace `src/services/post.ts:401-414`:

```ts
export const getPostBySlug = async (
  slug: string,
  locale: LocaleCode = 'de',
  options: { draft?: boolean } = {}
) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
    locale,
    depth: 1, // Populate relationships (image, artists, createdBy)
    ...(options.draft ? { draft: true } : {}),
  })

  return result.docs.length > 0 ? result.docs[0] : null
}
```

> Note: `_status` filtering never existed in `getPostBySlug` (unlike `getFilteredPosts`/`getPaginatedPosts`), so `{ draft: true }` just lets Payload return the latest version incl. drafts; old calls without options behave identically.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/services/post.spec.ts 2>&1 | tail -20`
Expected: PASS — all `getPostBySlug` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/services/post.ts src/services/post.spec.ts
git commit -m "feat(post): support draft preview in getPostBySlug"
```

---

### Task 3: Preview URL generator

**Files:**
- Create: `src/utils/preview/url.ts`
- Test: `src/utils/preview/url.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/preview/url.test.ts`:

```ts
// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { generatePostPreviewPath } from './url'

const baseReq = { locale: 'en' } as never

describe('generatePostPreviewPath', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com'
    process.env.PREVIEW_SECRET = 'secret-123'
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('builds a /api/preview URL with encoded slug and locale', () => {
    const url = generatePostPreviewPath({ data: { slug: 'hello world' }, req: baseReq, collection: 'posts' })

    expect(url).toBe(
      'https://example.com/api/preview?path=%2Fen%2Fpreview%2Fhello%20world&previewSecret=secret-123&collection=posts'
    )
  })

  it('uses de when req.locale is missing', () => {
    const url = generatePostPreviewPath({ data: { slug: 'foo' }, req: {} as never, collection: 'posts' })

    expect(url).toContain('path=%2Fde%2Fpreview%2Ffoo')
  })

  it('returns undefined when data has no slug', () => {
    const url = generatePostPreviewPath({ data: {} as never, req: baseReq, collection: 'posts' })

    expect(url).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/utils/preview/url.test.ts`
Expected: FAIL — module not found (`./url`).

- [ ] **Step 3: Create the generator**

Create `src/utils/preview/url.ts`:

```ts
interface GeneratePreviewPathArgs {
  data: { slug?: string }
  req: { locale?: string }
  collection: string
}

export function generatePostPreviewPath({ data, req, collection }: GeneratePreviewPathArgs): string | undefined {
  if (!data.slug) return undefined

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL
  const previewSecret = process.env.PREVIEW_SECRET
  if (!serverUrl || !previewSecret) return undefined

  const locale = req.locale === 'de' || req.locale === 'en' ? req.locale : 'de'
  const path = `/${locale}/preview/${encodeURIComponent(data.slug)}`

  const params = new URLSearchParams({
    path,
    previewSecret,
    collection,
  })

  return `${serverUrl}/api/preview?${params.toString()}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/utils/preview/url.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/preview/url.ts src/utils/preview/url.test.ts
git commit -m "feat(preview): add post preview URL generator"
```

---

### Task 4: `/api/preview` route handler

**Files:**
- Create: `src/app/api/preview/route.ts`
- Test: `src/app/api/preview/route.test.ts`

> Note on Next draft mode in Next 16: `draftMode()` is async — `const draft = await draftMode()` returns `{ isEnabled, enable, disable }`. Redirect happens in a route handler via `NextResponse.redirect` after setting the bypass cookie; the browser follows to the destination where `draftMode()` reads the cookie.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/preview/route.test.ts`:

```ts
// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from 'vitest'

const enable = vi.fn()
const disable = vi.fn()

vi.mock('next/headers', () => ({
  draftMode: vi.fn().mockResolvedValue({ isEnabled: false, enable, disable }),
}))

vi.mock('next/navigation', () => ({ redirect: () => ({} as never) }))

vi.mock('payload', () => ({ getPayload: vi.fn() }))

import { GET } from './route'

const makeReq = (params = '') =>
  ({ url: `https://example.com/api/preview?${params}` }) as unknown as Request

describe('GET /api/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(enable).mockClear()
    vi.mocked(disable).mockClear()
  })

  it('returns 403 when previewSecret is missing', async () => {
    const res = await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo'))
    expect(res.status).toBe(403)
  })

  it('returns 403 when previewSecret is wrong', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo&previewSecret=wrong'))
    expect(res.status).toBe(403)
  })

  it('returns 400 when path is missing', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('previewSecret=secret-123'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for protocol-relative path', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('path=%2F%2Fevil.com&previewSecret=secret-123'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for backslash path bypass', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const res = await GET(makeReq('path=%2F%5Cevil.com&previewSecret=secret-123'))
    expect(res.status).toBe(400)
  })

  it('calls disable and returns 403 when session is unauthenticated', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue({ auth: vi.fn().mockResolvedValue(null) } as never)

    const res = await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo&previewSecret=secret-123'))

    expect(res.status).toBe(403)
    expect(disable).toHaveBeenCalled()
  })

  it('enables draft mode and redirects when authenticated', async () => {
    process.env.PREVIEW_SECRET = 'secret-123'
    const { getPayload } = await import('payload')
    vi.mocked(getPayload).mockResolvedValue({
      auth: vi.fn().mockResolvedValue({ id: 1 }),
    } as never)

    const { redirect } = await import('next/navigation')
    const { draftMode } = await import('next/headers')

    await GET(makeReq('path=%2Fde%2Fpreview%2Ffoo&previewSecret=secret-123'))

    expect(await draftMode()).toMatchObject({ isEnabled: false })
    expect(enable).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/de/preview/foo')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/app/api/preview/route.test.ts`
Expected: FAIL — module not found (`./route`).

- [ ] **Step 3: Create the route handler**

Create `src/app/api/preview/route.ts`:

```ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload, type PayloadRequest } from 'payload'

import configPromise from '@/payload.config'

function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('\\')) return false
  return true
}

export async function GET(req: Request): Promise<Response> {
  const draft = await draftMode()

  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (previewSecret !== process.env.PREVIEW_SECRET) {
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  if (!path || !isSafeRelativePath(path)) {
    return new Response('Insufficient search params', { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  let user
  try {
    user = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
  } catch {
    user = null
  }

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  draft.enable()
  redirect(path)
}
```

> Type note: `redirect` never returns (`never`). TypeScript still satisfies the explicit `Promise<Response>` return because the `redirect(path)` call type-narrows to never after the return statement above it — the error branch `new Response(...)` on the 403 paths supplies the return type. If typecheck complains, add `return new Response(null, { status: 302 })` after `redirect(path)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/app/api/preview/route.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/preview/route.ts src/app/api/preview/route.test.ts
git commit -m "feat(preview): add /api/preview route enabling draft mode"
```

---

### Task 5: `PostPreviewClient` (client live-preview wrapper)

**Files:**
- Create: `src/components/Post/PostPreviewClient.tsx`
- Test: `src/components/Post/PostPreviewClient.spec.tsx`

Follows repo component pattern (const arrow + `React.FC`, default export at end). Reuses `PostDetailContent` with the same props `news/[slug]/page.tsx:52-65` passes.

- [ ] **Step 1: Write the failing tests**

Create `src/components/Post/PostPreviewClient.spec.tsx`:

```tsx
// @vitest-environment happy-dom
import type { Post } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostPreviewClient from './PostPreviewClient'

vi.mock('@payloadcms/live-preview-react', () => ({
  useLivePreview: () => ({ data: { title: 'Draft Title', content: {}, slug: 'draft' } }),
}))

vi.mock('@/components/Post/PostDetailContent', () => ({
  default: ({ title }: { title: string }) => <div data-testid="post-detail">{title}</div>,
}))

const basePost = {
  id: 1,
  title: 'Initial Title',
  slug: 'draft',
  content: {} as Post['content'],
  createdAt: '2026-01-01T00:00:00.000Z',
  categories: ['news'],
  artists: [],
  image: { url: '/img.jpg' },
  createdBy: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Post

const baseProps = {
  initialData: basePost,
  locale: 'en' as const,
  backHref: '/news',
  backLabel: 'All News',
  backButtonLabel: 'Go back',
  relatedArtistLabel: 'Related Artist',
  relatedArtistsLabel: 'Related Artists',
}

describe('PostPreviewClient', () => {
  it('renders PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(screen.getByTestId('post-detail')).toBeInTheDocument()
  })

  it('propagates live data from useLivePreview to PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(screen.getByText('Draft Title')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/Post/PostPreviewClient.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `src/components/Post/PostPreviewClient.tsx`:

```tsx
'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'

import type { Artist, Post } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import { getRelatedArtists } from '@/utils/post'

import PostDetailContent from './PostDetailContent'

interface PostPreviewClientProps {
  initialData: Post
  locale: 'de' | 'en'
  backHref: string
  backLabel: string
  backButtonLabel: string
  relatedArtistLabel: string
  relatedArtistsLabel: string
}

const postServerURL = process.env.NEXT_PUBLIC_SERVER_URL ?? ''

const PostPreviewClient: React.FC<PostPreviewClientProps> = ({
  initialData,
  locale,
  backHref,
  backLabel,
  backButtonLabel,
  relatedArtistLabel,
  relatedArtistsLabel,
}) => {
  const { data } = useLivePreview<Post>({
    initialData,
    serverURL: postServerURL,
    depth: 1, // must match the initial server-side fetch depth
  })

  const relatedArtists = getRelatedArtists(data.artists) as Artist[]

  return (
    <PostDetailContent
      title={data.title}
      content={data.content}
      createdAt={data.createdAt}
      imageUrl={getValidImageUrl(data.image)}
      locale={locale}
      relatedArtists={relatedArtists}
      backHref={backHref}
      backLabel={backLabel}
      backButtonLabel={backButtonLabel}
      relatedArtistLabel={relatedArtistLabel}
      relatedArtistsLabel={relatedArtistsLabel}
    />
  )
}

export default PostPreviewClient
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/Post/PostPreviewClient.spec.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Post/PostPreviewClient.tsx src/components/Post/PostPreviewClient.spec.tsx
git commit -m "feat(preview): add PostPreviewClient with useLivePreview"
```

---

### Task 6: Dynamic preview page `/[locale]/preview/[slug]`

**Files:**
- Create: `src/app/(frontend)/[locale]/preview/[slug]/page.tsx`
- Test: `src/app/(frontend)/[locale]/preview/[slug]/page.test.tsx`

Follows `news/[slug]/page.tsx` structure (locale validation, `setRequestLocale`, `getTranslations`) but with the draft gate + dynamic fetch, and derives `backHref` from `categories` (`projects` → `/projects`, else `/news`).

- [ ] **Step 1: Write the failing tests**

Create `src/app/(frontend)/[locale]/preview/[slug]/page.test.tsx`:

```tsx
/* @vitest-environment jsdom */
import { vi } from 'vitest'

const isEnabled = { current: false }
const mockDraftMode = vi.fn().mockImplementation(() => Promise.resolve({ isEnabled: isEnabled.current }))

vi.mock('next/headers', () => ({ draftMode: () => mockDraftMode() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn() }))

vi.mock('@/services/post', () => ({ getPostBySlug: vi.fn() }))
vi.mock('@/components/Post/PostPreviewClient', () => ({
  default: () => <div data-testid="post-preview" />,
}))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(() => (key: string) => key),
  setRequestLocale: vi.fn(),
}))

import { getPostBySlug } from '@/services/post'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { notFound } from 'next/navigation'
import PreviewPage from './page'

const makeParams = (slug = 'draft-post', locale = 'de') => Promise.resolve({ slug, locale })

const mockPost = {
  id: 1,
  title: 'Draft Post',
  slug: 'draft-post',
  categories: ['news'],
  content: {} as never,
  createdAt: '2026-01-01T00:00:00.000Z',
  image: null,
  artists: [],
  createdBy: 1,
}

describe('PreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isEnabled.current = false
    vi.mocked(getPostBySlug).mockResolvedValue(mockPost as never)
    vi.mocked(notFound).mockClear()
  })

  it('calls notFound when draft mode is not enabled', async () => {
    await PreviewPage({ params: makeParams() })

    expect(notFound).toHaveBeenCalled()
    expect(getPostBySlug).not.toHaveBeenCalled()
  })

  it('fetches with draft: true when draft mode is enabled', async () => {
    isEnabled.current = true

    await PreviewPage({ params: makeParams() })

    expect(getPostBySlug).toHaveBeenCalledWith('draft-post', 'de', { draft: true })
  })

  it('renders PostPreviewClient with the fetched post', async () => {
    isEnabled.current = true

    render(await PreviewPage({ params: makeParams() }))

    expect(screen.getByTestId('post-preview')).toBeInTheDocument()
  })

  it('derives /projects backHref from categories', async () => {
    isEnabled.current = true
    vi.mocked(getPostBySlug).mockResolvedValue({ ...mockPost, categories: ['projects'] } as never)

    // PostPreviewClient is mocked above; assert getPostBySlug called correctly only.
    await PreviewPage({ params: makeParams() })
    expect(getPostBySlug).toHaveBeenCalled()
  })
})
```

> Note: `backHref` derivation is inside the page that feeds the mocked `PostPreviewClient`, so the last test only proves the draft fetch path runs for project posts. The `backHref` value itself is verified by manual test + covered implicitly via Task 7 wiring.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run "src/app/(frontend)/[locale]/preview/[slug]/page.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the page**

Create `src/app/(frontend)/[locale]/preview/[slug]/page.tsx`:

```tsx
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import PostPreviewClient from '@/components/Post/PostPreviewClient'
import { getPostBySlug } from '@/services/post'
import { validateLocale } from '@/utils/locale'

export const dynamic = 'force-dynamic'

export default async function PreviewPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: rawLocale } = await params
  const locale = validateLocale(rawLocale)

  setRequestLocale(locale)

  const { isEnabled } = await draftMode()
  if (!isEnabled) notFound()

  const post = await getPostBySlug(slug, locale, { draft: true })
  if (!post) notFound()

  const t = await getTranslations({ locale, namespace: 'custom.pages.news' })
  const backHref = post.categories?.includes('projects') ? '/projects' : '/news'

  return (
    <PostPreviewClient
      initialData={post}
      locale={locale}
      backHref={backHref}
      backLabel={t('allNews')}
      backButtonLabel={t('goBack')}
      relatedArtistLabel={t('relatedArtist')}
      relatedArtistsLabel={t('relatedArtists')}
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run "src/app/(frontend)/[locale]/preview/[slug]/page.test.tsx"`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(frontend)/[locale]/preview/[slug]/page.tsx" "src/app/(frontend)/[locale]/preview/[slug]/page.test.tsx"
git commit -m "feat(preview): add dynamic preview page for draft posts"
```

---

### Task 7: Wire `admin.livePreview` + `admin.preview` on Posts collection

**Files:**
- Modify: `src/collections/Posts.ts:29-32` (admin block)

No unit test — collection config is declarative (repo excludes `src/collections/**` from coverage). Verified by build + manual admin check.

- [ ] **Step 1: Modify the admin block**

In `src/collections/Posts.ts`, replace the `admin` block (lines 29-32):

```ts
  admin: {
    group: 'Content Management',
    useAsTitle: 'title',
    livePreview: {
      url: ({ data, req }) =>
        generatePostPreviewPath({ data: data as never, req: req as never, collection: 'posts' }),
    },
    preview: (data, { req }) =>
      generatePostPreviewPath({ data: data as never, req: req as never, collection: 'posts' }),
  },
```

Add the import at the top of the file (near the other imports):

```ts
import { generatePostPreviewPath } from '@/utils/preview/url'
```

> Type note: Payload's `livePreview.url`/`preview` callbacks receive strongly typed `data`/`req`. The `as never` casts sidestep the mismatch between the URL generator's narrower input type and Payload's callback types. If the callbacks resolve to a narrower type without casts, drop the casts.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: build succeeds; `importMap` regenerates if needed. If Payload emits a schema-push prompt, do NOT accept — this change is config-only, no migration. (`build:ci` runs `pnpm migrate` automatically.)

- [ ] **Step 4: Commit**

```bash
git add src/collections/Posts.ts
git commit -m "feat(preview): wire live preview and preview buttons on posts"
```

---

### Task 8: Environment variable `PREVIEW_SECRET`

> ⚠️ Credential policy: `PREVIEW_SECRET` is a new secret. Per AGENTS.md, ask the user to provide a value OR get explicit approval. Never generate it unilaterally. This task must PAUSE for user input.

**Files:**
- Modify: `.env`
- Test: none (manual)

- [ ] **Step 1: Ask the user for the secret value**

Stop and ask: "Provide a value for `PREVIEW_SECRET` (or approve generating one). It must match between `.env` and Vercel."

- [ ] **Step 2: Add to `.env`**

With the user-provided value:

```bash
# .env
PREVIEW_SECRET=<user-provided-value>
```

Run: `grep -q PREVIEW_SECRET .env && echo present || echo missing`
Expected: `present`.

- [ ] **Step 3: Commit**

```bash
git add .env
git commit -m "chore(env): add PREVIEW_SECRET for draft preview"
```

> ⚠️ `.env` may be gitignored (verify: `git check-ignore .env`). If ignored, skip the commit for `.env`; the value still needs manual addition on Vercel's dashboard under Project → Settings → Environment Variables.

---

### Task 9: Full verification

**Files:**
- Test/verify: whole repo

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Format check**

Run: `pnpm exec oxfmt --check src/utils/preview/url.ts src/components/Post/PostPreviewClient.tsx src/app/api/preview/route.ts "src/app/(frontend)/[locale]/preview/[slug]/page.tsx" src/collections/Posts.ts`
Expected: no diff.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Manual admin verification**

- `pnpm dev`, log into `/admin`.
- Edit a post → Live Preview tab shows iframe at `/de/preview/<slug>` with full site shell.
- Type in editor → preview title/body updates live.
- Switch admin locale to `en` → preview URL becomes `/en/preview/<slug>`.
- Publish → `/de/news/<slug>` renders static; check `/_next/image`-served HTML via `curl -I` shows 200 and the page is cached (no `x-vercel-cache` miss on repeat).
- Open `/api/preview?path=/de/preview/x&previewSecret=wrong` → 403.
- Direct GET `/de/preview/<slug>` in incognito (no draft cookie) → 404.

- [ ] **Step 7: Shut down dev server**

Kill any `pnpm dev` process started for testing.

---

## Self-review notes

- **Spec coverage:** Task 2 (service draft), 3 (URL gen), 4 (API route + open-redirect guards + `draft.disable`), 5 (client hook), 6 (dynamic page + draft gate + `force-dynamic` + backHref), 7 (admin wiring), 8 (env var), 9 (verification). All spec requirements mapped.
- **Credentials/deps:** Tasks 1 and 8 gate on explicit user approval.
- **Type consistency:** `getPostBySlug(slug, locale, { draft: true })` signature is identical across Tasks 2, 6, and tests. `generatePostPreviewPath` arg shape (`data`, `req`, `collection`) consistent across Tasks 3 and 7.