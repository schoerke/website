# Artist Tab Conditional Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the News tab on the artist detail page when the artist has no published news posts, and hide the Projects tab when the artist has no associated projects.

**Architecture:** Add a `getNewsPostCountByArtist` service function using `payload.count()`. Fetch the count in `page.tsx` after `getArtistBySlug` resolves. Compute `hasNews` and `hasProjects` booleans and pass to `ArtistTabs`, which filters the `tabs` array before rendering.

**Tech Stack:** Next.js App Router, Payload CMS Local API, TypeScript, Vitest, React Testing Library

---

## File Map

| File                                                  | Change                                               |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `src/services/post.ts`                                | Add `getNewsPostCountByArtist` function              |
| `src/services/post.spec.ts`                           | Add tests for `getNewsPostCountByArtist`             |
| `src/app/(frontend)/[locale]/artists/[slug]/page.tsx` | Fetch news count, compute booleans, pass props       |
| `src/components/Artist/ArtistTabs.tsx`                | Add `hasNews`/`hasProjects` props, filter tabs array |
| `src/components/Artist/ArtistTabs.spec.tsx`           | Add tests for conditional tab visibility             |

---

## Task 1: Add `getNewsPostCountByArtist` to post service

**Files:**

- Modify: `src/services/post.ts`
- Test: `src/services/post.spec.ts`

- [ ] **Step 1: Write the failing test**

Open `src/services/post.spec.ts`. Add the import and a new `describe` block. Add it after the existing `getAllProjectPostsByArtist` describe block.

First, add `getNewsPostCountByArtist` to the import at the top of the file:

```ts
import {
  getAllHomepagePosts,
  getAllNewsPosts,
  getAllNewsPostsByArtist,
  getAllPosts,
  getAllProjectPosts,
  getAllProjectPostsByArtist,
  getFilteredPosts,
  getNewsPostCountByArtist,
  getPaginatedPosts,
  getPostBySlug,
} from './post'
```

Then add this describe block (before the closing `}` of the outer `describe('Post Service', ...)`):

```ts
describe('getNewsPostCountByArtist', () => {
  it('should return the count of published news posts for an artist', async () => {
    mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 5 })

    const result = await getNewsPostCountByArtist(42, 'en')

    expect(result).toBe(5)
    expect(mockPayload.count).toHaveBeenCalledWith({
      collection: 'posts',
      where: {
        categories: { contains: 'news' },
        artists: { equals: 42 },
        _status: { equals: 'published' },
      },
      locale: 'en',
    })
  })

  it('should return 0 when no news posts exist for the artist', async () => {
    mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 0 })

    const result = await getNewsPostCountByArtist(99, 'de')

    expect(result).toBe(0)
  })

  it('should use default locale de when not specified', async () => {
    mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 3 })

    await getNewsPostCountByArtist(1)

    expect(mockPayload.count).toHaveBeenCalledWith(expect.objectContaining({ locale: 'de' }))
  })
})
```

Note: the `mockPayload` type is `Payload` — add `count` to the mock in `beforeEach`:

```ts
mockPayload = {
  find: vi.fn(),
  count: vi.fn(),
} as unknown as Payload
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/services/post.spec.ts --reporter=verbose
```

Expected: FAIL — `getNewsPostCountByArtist is not a function`

- [ ] **Step 3: Implement `getNewsPostCountByArtist` in `src/services/post.ts`**

Add after `getAllProjectPostsByArtist` (around line 175):

```ts
/**
 * Returns the count of published news posts associated with a specific artist.
 * Useful for determining whether to show the News tab on the artist detail page.
 *
 * @param artistId - The artist's numeric ID
 * @param locale - Optional locale code ('de' or 'en'). Defaults to 'de'
 * @returns A promise resolving to the count of matching posts
 *
 * @example
 * const count = await getNewsPostCountByArtist(42, 'en')
 * const hasNews = count > 0
 */
export const getNewsPostCountByArtist = async (artistId: number, locale?: 'de' | 'en'): Promise<number> => {
  const payload = await getPayload({ config })
  const result = await payload.count({
    collection: 'posts',
    where: {
      categories: { contains: 'news' },
      artists: { equals: artistId },
      _status: { equals: 'published' },
    },
    locale: locale || 'de',
  })
  return result.totalDocs
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/services/post.spec.ts --reporter=verbose
```

Expected: all post service tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/post.ts src/services/post.spec.ts
git commit -m "feat(post-service): add getNewsPostCountByArtist using payload.count"
```

---

## Task 2: Fetch count and pass booleans from artist page

**Files:**

- Modify: `src/app/(frontend)/[locale]/artists/[slug]/page.tsx`

- [ ] **Step 1: Add import for `getNewsPostCountByArtist`**

In `page.tsx`, add to the existing services import:

```ts
import { getArtistBySlug } from '@/services/artist'
import { getNewsPostCountByArtist } from '@/services/post'
```

- [ ] **Step 2: Fetch news count and compute booleans after artist resolves**

In `ArtistDetailPage`, after `const artist = await getArtistBySlug(slug, locale as 'de' | 'en')` and the `notFound()` guard, add:

```ts
const newsCount = await getNewsPostCountByArtist(artist.id, locale as 'de' | 'en')

const hasNews = newsCount > 0
const hasProjects = ((artist.projects || []) as unknown[]).filter((p) => typeof p === 'object' && p !== null).length > 0
```

- [ ] **Step 3: Pass props to `ArtistTabs`**

Change:

```tsx
<ArtistTabs artist={artist} locale={locale} />
```

To:

```tsx
<ArtistTabs artist={artist} locale={locale} hasNews={hasNews} hasProjects={hasProjects} />
```

- [ ] **Step 4: Do not run TypeScript check yet**

TypeScript will report an error until Task 3 updates `ArtistTabsProps` to accept `hasNews` and `hasProjects`. Proceed directly to Task 3. The commit for this task is at the end of Task 3.

---

## Task 3: Update `ArtistTabs` to accept and use visibility props

**Files:**

- Modify: `src/components/Artist/ArtistTabs.tsx`
- Test: `src/components/Artist/ArtistTabs.spec.tsx`

- [ ] **Step 1: Write failing tests for conditional tab visibility**

In `src/components/Artist/ArtistTabs.spec.tsx`, add a new describe block after the existing `describe('Initial rendering', ...)`:

```ts
describe('Conditional tab visibility', () => {
  it('should hide News tab when hasNews is false', () => {
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={true} />)

    expect(screen.queryAllByText('News')).toHaveLength(0)
    expect(screen.getAllByText('Projects')).toHaveLength(2)
  })

  it('should show News tab when hasNews is true', () => {
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

    expect(screen.getAllByText('News')).toHaveLength(2)
  })

  it('should hide Projects tab when hasProjects is false', () => {
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={false} />)

    expect(screen.queryAllByText('Projects')).toHaveLength(0)
    expect(screen.getAllByText('News')).toHaveLength(2)
  })

  it('should show Projects tab when hasProjects is true', () => {
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

    expect(screen.getAllByText('Projects')).toHaveLength(2)
  })

  it('should hide both News and Projects tabs when both are false', () => {
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={false} />)

    expect(screen.queryAllByText('News')).toHaveLength(0)
    expect(screen.queryAllByText('Projects')).toHaveLength(0)
    expect(screen.getAllByText('Biography')).toHaveLength(2)
  })

  it('should fall back to biography tab when hash points to hidden News tab', async () => {
    window.location.hash = '#news'
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={false} hasProjects={true} />)

    await waitFor(() => {
      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
    })
  })

  it('should fall back to biography tab when hash points to hidden Projects tab', async () => {
    window.location.hash = '#projects'
    const artist = createMockArtist()
    renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={false} />)

    await waitFor(() => {
      expect(screen.getByTestId('biography-tab')).toBeInTheDocument()
    })
  })
})
```

Also add `waitFor` to the import from `@testing-library/react` if not already present:

```ts
import { act, render, screen, waitFor } from '@testing-library/react'
```

- [ ] **Step 2: Update existing "should render all tab buttons" test**

The existing test passes `<ArtistTabs artist={artist} locale="en" />` without the new props. Update it to pass them explicitly so it continues to pass:

```ts
it('should render all tab buttons', () => {
  const artist = createMockArtist()
  renderWithIntl(<ArtistTabs artist={artist} locale="en" hasNews={true} hasProjects={true} />)

  expect(screen.getAllByText('Biography')).toHaveLength(2)
  expect(screen.getAllByText('Repertoire')).toHaveLength(2)
  expect(screen.getAllByText('Discography')).toHaveLength(2)
  expect(screen.getAllByText('Media')).toHaveLength(2)
  expect(screen.getAllByText('News')).toHaveLength(2)
  expect(screen.getAllByText('Projects')).toHaveLength(2)
})
```

Also update all other existing tests in the file that render `<ArtistTabs>` without `hasNews`/`hasProjects` — add `hasNews={true} hasProjects={true}` to each. Search for `<ArtistTabs` and add the props to every occurrence.

- [ ] **Step 3: Run tests to verify new tests fail**

```bash
pnpm test src/components/Artist/ArtistTabs.spec.tsx --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×"
```

Expected: new conditional visibility tests FAIL with type errors or wrong renders

- [ ] **Step 4: Update `ArtistTabsProps` interface**

In `src/components/Artist/ArtistTabs.tsx`, update the interface:

```ts
interface ArtistTabsProps {
  artist: Artist
  locale: string
  hasNews: boolean
  hasProjects: boolean
}
```

- [ ] **Step 5: Update `ArtistTabsInner` to filter tabs**

In `ArtistTabsInner`, replace:

```ts
const tabs: TabId[] = ['biography', 'repertoire', 'discography', 'media', 'news', 'projects']
```

With:

```ts
const tabs: TabId[] = (['biography', 'repertoire', 'discography', 'media', 'news', 'projects'] as TabId[]).filter(
  (tab) => {
    if (tab === 'news') return hasNews
    if (tab === 'projects') return hasProjects
    return true
  }
)
```

Update the destructured props in `ArtistTabsInner`:

```ts
const ArtistTabsInner: React.FC<ArtistTabsProps> = ({ artist, locale, hasNews, hasProjects }) => {
```

And update the outer `ArtistTabs` component to forward the new props:

```ts
const ArtistTabs: React.FC<ArtistTabsProps> = ({ artist, locale, hasNews, hasProjects }) => {
  return <ArtistTabsInner key={locale} artist={artist} locale={locale} hasNews={hasNews} hasProjects={hasProjects} />
}
```

The hash guard `useEffect` already handles hidden tabs correctly — `tabs.includes(hash as TabId)` will return `false` for hidden tabs, so the default `biography` tab is used. No change needed there.

- [ ] **Step 6: Run all ArtistTabs tests**

```bash
pnpm test src/components/Artist/ArtistTabs.spec.tsx --reporter=verbose
```

Expected: all tests pass

- [ ] **Step 7: Run TypeScript check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit Tasks 2 and 3 together**

```bash
git add \
  src/app/\(frontend\)/\[locale\]/artists/\[slug\]/page.tsx \
  src/components/Artist/ArtistTabs.tsx \
  src/components/Artist/ArtistTabs.spec.tsx
git commit -m "feat(artist): hide News and Projects tabs when artist has no content"
```

---

## Task 4: Full test suite verification

- [ ] **Step 1: Run all Header + Artist tests**

```bash
pnpm test src/components/Artist/ src/services/post.spec.ts --reporter=verbose
```

Expected: all tests pass

- [ ] **Step 2: Run full test suite**

```bash
pnpm test --reporter=verbose
```

Expected: all tests pass, no regressions

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: exit 0 (pre-existing warning in `SearchProvider.tsx` is acceptable)
