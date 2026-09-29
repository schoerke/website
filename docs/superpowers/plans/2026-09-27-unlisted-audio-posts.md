# Unlisted Posts + Direct Audio File Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Superseded (2026-09-29):** Tasks 6-10 (the `fileUrl` field, Dropbox normalizer, native
> `<audio>` rendering, and their converter wiring) were implemented as written below, then fully
> removed — Dropbox's CDN proved unreliable on iOS Safari (mislabeled `Content-Type`, and blocks
> mobile user-agents from the raw file entirely). Replaced by allowlisting SoundCloud's embed
> player for the pre-existing `embedCode` field. See commits `2099ecc` and `7f84fcc`. Tasks 1-5
> and 11-12 (the "Unlisted posts" half, plus the `posts.unlisted` migration) remain live and
> accurate. This plan is kept as historical record for Tasks 6-10; it no longer reflects the
> current state of `src/blocks/AudioEmbed.ts`, `src/components/blocks/AudioEmbed.tsx`,
> `src/components/ui/PayloadRichText.tsx`, or `src/validators/audioFields.ts`.

**Goal:** Let staff mark a Post "unlisted" (live but hidden from listings/sitemap/artist pages) and embed a direct audio-file URL (e.g. Dropbox) that plays with a native HTML5 `<audio>` player.

**Architecture:** A new `unlisted` checkbox on the Posts collection is checked by a new `includeUnlisted` option (default `false`) added to every service function that builds a public *list* of posts, plus the two places that were bypassing those service functions (`getArtistBySlug`, `getNewsPostCountByArtist`). Direct single-post lookup (`getPostBySlug`) stays unfiltered on purpose. Separately, the existing `AudioEmbed` Lexical block gains a third mutually-exclusive `fileUrl` field, validated as an `https:` URL, normalized from Dropbox share links to direct-stream form on save, and rendered as a native `<audio controls>` element.

**Tech Stack:** Payload CMS (SQLite via `@payloadcms/db-sqlite`), Next.js App Router, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-27-unlisted-audio-posts-design.md`

---

### Task 1: Add `unlisted` field to Posts collection

**Files:**
- Modify: `src/collections/Posts.ts`
- Test: `src/collections/Posts.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `describe` block at the end of `src/collections/Posts.test.ts` (after the existing `describe('Posts publishedDate field', ...)` block, before `describe('normalizedContent hook', ...)`):

```ts
describe('Posts unlisted field', () => {
  it('configures an unlisted checkbox field defaulting to false', () => {
    const field = Posts.fields?.find((candidate) => 'name' in candidate && candidate.name === 'unlisted')

    expect(field).toBeDefined()
    if (!field || !('type' in field) || field.type !== 'checkbox') {
      throw new Error('unlisted field missing or not typed as checkbox')
    }

    expect(field.defaultValue).toBe(false)
    expect(field.admin?.position).toBe('sidebar')
  })

  it('shows unlisted as an admin list column', () => {
    expect(Posts.admin?.defaultColumns ?? []).toContain('unlisted')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/collections/Posts.test.ts`
Expected: FAIL — `unlisted` field not found, `defaultColumns` doesn't contain `'unlisted'`.

- [ ] **Step 3: Implement**

In `src/collections/Posts.ts`, add `'unlisted'` to `admin.defaultColumns` (around line 138):

```ts
    defaultColumns: ['title', 'categories', 'unlisted', 'artists', 'publishedDate', '_status', 'updatedAt'],
```

Then add the new field to the `fields` array, right after the `artists` relationship field and before `image` (around line 283, after the closing `},` of the `artists` field):

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

- [ ] **Step 4: Regenerate Payload types**

Run: `pnpm payload generate:types`

This updates `src/payload-types.ts` so `Post.unlisted?: boolean | null` exists — required before later tasks reference `unlisted` on mock/typed `Post` objects.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/collections/Posts.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/collections/Posts.ts src/collections/Posts.test.ts src/payload-types.ts
git commit -m "feat(posts): add unlisted field to Posts collection"
```

---

### Task 2: Exclude unlisted posts from `getFilteredPosts` / `getPaginatedPosts`

**Files:**
- Modify: `src/services/post.ts`
- Test: `src/services/post.spec.ts`

- [ ] **Step 1: Write the failing tests**

In `src/services/post.spec.ts`, update the exact-match `where` assertions inside `describe('getFilteredPosts', ...)` to include the new `unlisted` clause, and add two new tests for `includeUnlisted`.

Replace the `'should fetch published posts by default'` test:

```ts
    it('should fetch published posts by default', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({})

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: { _status: { equals: 'published' }, unlisted: { not_equals: true } },
        limit: 100,
        locale: 'de',
        depth: 1,
        sort: ['-publishedDate', '-createdAt'],
      })
    })
```

Replace `'should filter by single category'`:

```ts
    it('should filter by single category', async () => {
      const newsPost = createMockPost({ categories: ['news'] })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([newsPost]))

      await getFilteredPosts({ category: 'news' })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          unlisted: { not_equals: true },
          categories: { contains: 'news' },
        },
        limit: 100,
        locale: 'de',
        depth: 1,
        sort: ['-publishedDate', '-createdAt'],
      })
    })
```

Replace `'should filter by multiple categories'`:

```ts
    it('should filter by multiple categories', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ category: ['news', 'projects'] })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          unlisted: { not_equals: true },
          categories: { in: ['news', 'projects'] },
        },
        limit: 100,
        locale: 'de',
        depth: 1,
        sort: ['-publishedDate', '-createdAt'],
      })
    })
```

Replace `'should filter by artist ID'`:

```ts
    it('should filter by artist ID', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ artistId: '123' })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          unlisted: { not_equals: true },
          artists: { equals: '123' },
        },
        limit: 100,
        locale: 'de',
        depth: 1,
        sort: ['-publishedDate', '-createdAt'],
      })
    })
```

Replace `'should combine category and artist filters'`:

```ts
    it('should combine category and artist filters', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ category: 'news', artistId: '123' })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          _status: { equals: 'published' },
          unlisted: { not_equals: true },
          categories: { contains: 'news' },
          artists: { equals: '123' },
        },
        limit: 100,
        locale: 'de',
        depth: 1,
        sort: ['-publishedDate', '-createdAt'],
      })
    })
```

Replace `'should include unpublished posts when publishedOnly is false'`:

```ts
    it('should include unpublished posts when publishedOnly is false', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ publishedOnly: false })

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'posts',
        where: { unlisted: { not_equals: true } },
        limit: 100,
        locale: 'de',
        depth: 1,
        sort: ['-publishedDate', '-createdAt'],
      })
    })
```

Add two new tests right after that one, still inside `describe('getFilteredPosts', ...)`:

```ts
    it('should include unlisted posts when includeUnlisted is true', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ includeUnlisted: true })

      const call = vi.mocked(mockPayload.find).mock.calls[0][0]
      expect(call.where).not.toHaveProperty('unlisted')
    })

    it('should exclude unlisted posts even when publishedOnly is false', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({ publishedOnly: false, includeUnlisted: false })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unlisted: { not_equals: true } }),
        })
      )
    })
```

Now do the equivalent for `describe('getPaginatedPosts', ...)`. Add these two new tests right after the existing `'should not filter by published status when publishedOnly is false'` test:

```ts
    it('should exclude unlisted posts by default', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unlisted: { not_equals: true } }),
        })
      )
    })

    it('should include unlisted posts when includeUnlisted is true', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news', includeUnlisted: true })

      const call = vi.mocked(mockPayload.find).mock.calls[0][0]
      expect(call.where).not.toHaveProperty('unlisted')
    })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/services/post.spec.ts`
Expected: FAIL — actual `where` objects don't include `unlisted`, and `includeUnlisted` is not a recognized option (TypeScript will also flag the unknown option if you run typecheck, but the test itself fails at runtime on the `where` mismatch).

- [ ] **Step 3: Implement**

In `src/services/post.ts`, update `getFilteredPosts`'s options type and body (around line 257):

```ts
export const getFilteredPosts = async (options: {
  category?: string | string[]
  artistId?: string
  search?: string
  limit?: number
  locale?: LocaleCode
  publishedOnly?: boolean
  includeUnlisted?: boolean
  select?: SelectType
  populate?: PopulateType
}) => {
  const payload = await getPayload({ config })

  const where: Where = {}

  // Filter by published status (default: true)
  if (options.publishedOnly !== false) {
    where._status = { equals: 'published' }
  }

  // Exclude unlisted posts from public listings (default: true)
  if (options.includeUnlisted !== true) {
    where.unlisted = { not_equals: true }
  }

  // Filter by category
  if (options.category) {
    where.categories = Array.isArray(options.category) ? { in: options.category } : { contains: options.category }
  }
```

(The rest of the function body is unchanged.)

Update `getPaginatedPosts`'s options type and body the same way (around line 350):

```ts
export const getPaginatedPosts = async (options: {
  category?: string | string[]
  artistId?: string
  search?: string
  page?: number
  limit?: number
  locale?: LocaleCode
  publishedOnly?: boolean
  includeUnlisted?: boolean
  select?: SelectType
  populate?: PopulateType
}) => {
  const payload = await getPayload({ config })

  const where: Where = {}

  // Filter by published status (default: true)
  if (options.publishedOnly !== false) {
    where._status = { equals: 'published' }
  }

  // Exclude unlisted posts from public listings (default: true)
  if (options.includeUnlisted !== true) {
    where.unlisted = { not_equals: true }
  }

```

(The rest of the function body is unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/services/post.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/post.ts src/services/post.spec.ts
git commit -m "feat(posts): exclude unlisted posts from getFilteredPosts/getPaginatedPosts by default"
```

---

### Task 3: Fix artist "News" tab count to exclude unlisted posts

**Files:**
- Modify: `src/services/post.ts`
- Test: `src/services/post.spec.ts`

- [ ] **Step 1: Write the failing test**

In `src/services/post.spec.ts`, replace the first test in `describe('getNewsPostCountByArtist', ...)`:

```ts
  describe('getNewsPostCountByArtist', () => {
    it('should return the count of published, non-unlisted news posts for an artist', async () => {
      mockPayload.count = vi.fn().mockResolvedValue({ totalDocs: 5 })

      const result = await getNewsPostCountByArtist(42, 'en')

      expect(result).toBe(5)
      expect(mockPayload.count).toHaveBeenCalledWith({
        collection: 'posts',
        where: {
          categories: { contains: 'news' },
          artists: { equals: 42 },
          _status: { equals: 'published' },
          unlisted: { not_equals: true },
        },
        locale: 'en',
      })
    })
```

(Leave the other two tests in that `describe` block unchanged — they use `expect.objectContaining` or only check the return value.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/services/post.spec.ts`
Expected: FAIL — actual `where` object is missing `unlisted`.

- [ ] **Step 3: Implement**

In `src/services/post.ts`, update `getNewsPostCountByArtist` (around line 185):

```ts
export const getNewsPostCountByArtist = async (artistId: number, locale?: 'de' | 'en'): Promise<number> => {
  const payload = await getPayload({ config })
  const result = await payload.count({
    collection: 'posts',
    where: {
      categories: { contains: 'news' },
      artists: { equals: artistId },
      _status: { equals: 'published' },
      unlisted: { not_equals: true },
    },
    locale: locale || 'de',
  })
  return result.totalDocs
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/services/post.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/post.ts src/services/post.spec.ts
git commit -m "fix(posts): exclude unlisted posts from getNewsPostCountByArtist"
```

---

### Task 4: Fix artist "Projects" tab leak in `getArtistBySlug`

**Files:**
- Modify: `src/services/artist.ts`
- Test: `src/services/artist.spec.ts`

- [ ] **Step 1: Write the failing test**

In `src/services/artist.spec.ts`, add this test right after `'should return no projects when every populated project is a draft'` (inside `describe('getArtistBySlug', ...)`):

```ts
    it('should exclude unlisted projects from populated artist data', async () => {
      const listedProject = createMockPost({ id: 10, _status: 'published', unlisted: false })
      const unlistedProject = createMockPost({ id: 20, _status: 'published', unlisted: true })
      const mockArtist = createMockArtist({ projects: [listedProject, unlistedProject] })
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([mockArtist]))

      const result = await getArtistBySlug('test-artist')

      expect(result?.projects).toEqual([listedProject])
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/services/artist.spec.ts`
Expected: FAIL — `result?.projects` includes both posts since `unlisted` isn't checked.

- [ ] **Step 3: Implement**

In `src/services/artist.ts`, update the `projects` filter in `getArtistBySlug` (around line 91-96):

```ts
  return {
    ...artist,
    projects: artist.projects?.filter(
      (project): project is Post =>
        typeof project === 'object' &&
        project !== null &&
        project._status === 'published' &&
        project.unlisted !== true
    ),
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/services/artist.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/artist.ts src/services/artist.spec.ts
git commit -m "fix(artists): exclude unlisted posts from artist Projects tab"
```

---

### Task 5: Exclude unlisted posts from the sitemap

**Files:**
- Modify: `src/app/sitemap.ts`
- Test: `src/app/sitemap.spec.ts`

- [ ] **Step 1: Write the failing test**

In `src/app/sitemap.spec.ts`, update the `where` clauses inside the `'queries public content once per kind and locale with public access controls'` test (around lines 143 and 153):

```ts
          {
            collection: 'posts',
            locale,
            depth: 0,
            fallbackLocale: false,
            limit: 0,
            overrideAccess: false,
            select: { id: true, slug: true, updatedAt: true },
            where: {
              _status: { equals: 'published' },
              unlisted: { not_equals: true },
              categories: { contains: 'news' },
            },
          },
          {
            collection: 'posts',
            locale,
            depth: 0,
            fallbackLocale: false,
            limit: 0,
            overrideAccess: false,
            select: { id: true, slug: true, updatedAt: true },
            where: {
              _status: { equals: 'published' },
              unlisted: { not_equals: true },
              categories: { contains: 'projects' },
            },
          },
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/sitemap.spec.ts`
Expected: FAIL — actual `where` clauses lack `unlisted`.

- [ ] **Step 3: Implement**

In `src/app/sitemap.ts`, update both `payload.find` calls for `posts` inside `getEntriesForLocale` (around lines 102-121):

```ts
    payload.find({
      collection: 'posts',
      locale,
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      overrideAccess: false,
      select: { id: true, slug: true, updatedAt: true },
      where: { _status: { equals: 'published' }, unlisted: { not_equals: true }, categories: { contains: 'news' } },
    }),
    payload.find({
      collection: 'posts',
      locale,
      depth: 0,
      fallbackLocale: false,
      limit: 0,
      overrideAccess: false,
      select: { id: true, slug: true, updatedAt: true },
      where: {
        _status: { equals: 'published' },
        unlisted: { not_equals: true },
        categories: { contains: 'projects' },
      },
    }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/sitemap.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/sitemap.ts src/app/sitemap.spec.ts
git commit -m "fix(sitemap): exclude unlisted posts from sitemap"
```

---

### Task 6: Three-way mutual exclusivity + `https:`-only scheme for audio validators

**Files:**
- Modify: `src/validators/audioFields.ts`
- Test: `src/validators/audioFields.spec.ts`

This task rewrites both files in full — the shared conflict-checking logic changes every existing message string, so partial edits would leave the two files inconsistent mid-step.

- [ ] **Step 1: Write the failing test (full file replace)**

Replace the entire contents of `src/validators/audioFields.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateAudioURL, validateEmbedCode, validateFileURL } from './audioFields'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>`
const SPOTIFY_URL = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'
const DROPBOX_URL = 'https://www.dropbox.com/s/abc123/recording.mp3?dl=0'

describe('validateAudioURL', () => {
  it('accepts a Spotify track URL', () => {
    expect(validateAudioURL(SPOTIFY_URL)).toBe(true)
  })

  it('accepts an Apple Music album URL', () => {
    expect(validateAudioURL('https://music.apple.com/us/album/example/1234567890')).toBe(true)
  })

  it('accepts an empty url when sibling embedCode is present', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })).toBe(
      true
    )
  })

  it('accepts an empty url when sibling fileUrl is present', () => {
    expect(validateAudioURL('', { siblingData: { fileUrl: DROPBOX_URL } })).toBe(true)
  })

  it('rejects an empty url when no sibling field is set', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects an invalid url even when embedCode is present', () => {
    expect(
      validateAudioURL('not-a-url', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe('Please enter a valid URL format')
  })

  it('accepts an undefined url when sibling embedCode is present', () => {
    expect(
      validateAudioURL(undefined, { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe(true)
  })

  it('accepts a null url when sibling embedCode is present', () => {
    expect(validateAudioURL(null, { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })).toBe(
      true
    )
  })

  it('rejects an undefined url when no sibling field is set', () => {
    expect(validateAudioURL(undefined, { siblingData: { embedCode: '' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects all three fields being whitespace', () => {
    expect(validateAudioURL('   ', { siblingData: { embedCode: '   ', fileUrl: '   ' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects url set together with embedCode, naming the conflicting field', () => {
    expect(
      validateAudioURL(SPOTIFY_URL, { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe('Clear the Embed Code field first')
  })

  it('rejects url set together with fileUrl, naming the conflicting field', () => {
    expect(validateAudioURL(SPOTIFY_URL, { siblingData: { fileUrl: DROPBOX_URL } })).toBe(
      'Clear the Audio File URL field first'
    )
  })

  it('rejects url set together with both other fields, naming both', () => {
    expect(
      validateAudioURL(SPOTIFY_URL, {
        siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>', fileUrl: DROPBOX_URL },
      })
    ).toBe('Clear the Embed Code and Audio File URL fields first')
  })
})

describe('validateEmbedCode', () => {
  it('accepts an iframe snippet from an allowlisted host', () => {
    expect(validateEmbedCode(RTS_SNIPPET)).toBe(true)
  })

  it('accepts a snippet from a subdomain of an allowlisted host', () => {
    expect(validateEmbedCode('<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>')).toBe(true)
  })

  it('rejects an iframe from a non-allowlisted host', () => {
    expect(validateEmbedCode('<iframe src="https://evil.example.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects a lookalike host', () => {
    expect(validateEmbedCode('<iframe src="https://rts-ch.evil.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects text that is not an iframe', () => {
    expect(validateEmbedCode('just some text')).toBe('Please enter a valid embed code')
    expect(validateEmbedCode('<div>hi</div>')).toBe('Please enter a valid embed code')
  })

  it('rejects a snippet without src', () => {
    expect(validateEmbedCode('<iframe width="392"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('validates the real src, not a data-src attribute', () => {
    expect(
      validateEmbedCode('<iframe data-src="https://www.rts.ch/x" src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
    expect(
      validateEmbedCode('<iframe data-src="https://evil.example.com/x" src="https://www.rts.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects non-https src', () => {
    expect(validateEmbedCode('<iframe src="http://rts.ch/play/embed?urn=x"></iframe>')).toBe(
      'Please enter a valid embed code'
    )
  })

  it('ignores src attributes outside the iframe tag', () => {
    expect(
      validateEmbedCode('<img src="https://evil.example.com/x"><iframe src="https://www.rts.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects javascript and data URLs', () => {
    expect(validateEmbedCode('<iframe src="javascript:alert(1)"></iframe>')).toBe('Please enter a valid embed code')
    expect(validateEmbedCode('<iframe src="data:text/html,x"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('accepts an empty embed code when sibling url is present', () => {
    expect(validateEmbedCode('', { siblingData: { url: SPOTIFY_URL } })).toBe(true)
  })

  it('accepts an empty embed code when sibling fileUrl is present', () => {
    expect(validateEmbedCode('', { siblingData: { fileUrl: DROPBOX_URL } })).toBe(true)
  })

  it('rejects an empty embed code when no sibling field is set', () => {
    expect(validateEmbedCode('', { siblingData: { url: '' } })).toBe(
      'Please enter an audio URL, embed code, or audio file URL'
    )
  })

  it('rejects non-string values', () => {
    expect(validateEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(null)).toBe('Please enter an audio URL, embed code, or audio file URL')
    expect(validateEmbedCode(undefined)).toBe('Please enter an audio URL, embed code, or audio file URL')
  })

  it('rejects embedCode set together with url, naming the conflicting field', () => {
    expect(validateEmbedCode(RTS_SNIPPET, { siblingData: { url: SPOTIFY_URL } })).toBe(
      'Clear the Audio URL field first'
    )
  })

  it('rejects embedCode set together with fileUrl, naming the conflicting field', () => {
    expect(validateEmbedCode(RTS_SNIPPET, { siblingData: { fileUrl: DROPBOX_URL } })).toBe(
      'Clear the Audio File URL field first'
    )
  })
})

describe('validateFileURL', () => {
  it('accepts a valid https URL', () => {
    expect(validateFileURL(DROPBOX_URL)).toBe(true)
  })

  it('accepts an empty fileUrl when sibling url is present', () => {
    expect(validateFileURL('', { siblingData: { url: SPOTIFY_URL } })).toBe(true)
  })

  it('accepts an empty fileUrl when sibling embedCode is present', () => {
    expect(validateFileURL('', { siblingData: { embedCode: RTS_SNIPPET } })).toBe(true)
  })

  it('rejects an empty fileUrl when no sibling field is set', () => {
    expect(validateFileURL('')).toBe('Please enter an audio URL, embed code, or audio file URL')
  })

  it('rejects a malformed URL', () => {
    expect(validateFileURL('not-a-url')).toBe('Please enter a valid URL format')
  })

  it('rejects a non-https scheme', () => {
    expect(validateFileURL('http://example.com/file.mp3')).toBe('Please enter a valid audio file URL (https only)')
    expect(validateFileURL('javascript:alert(1)')).toBe('Please enter a valid audio file URL (https only)')
    expect(validateFileURL('data:text/html,x')).toBe('Please enter a valid audio file URL (https only)')
  })

  it('rejects non-string values', () => {
    expect(validateFileURL(123)).toBe('Please enter a valid audio file URL')
  })

  it('rejects fileUrl set together with url, naming the conflicting field', () => {
    expect(validateFileURL(DROPBOX_URL, { siblingData: { url: SPOTIFY_URL } })).toBe('Clear the Audio URL field first')
  })

  it('rejects fileUrl set together with embedCode, naming the conflicting field', () => {
    expect(validateFileURL(DROPBOX_URL, { siblingData: { embedCode: RTS_SNIPPET } })).toBe(
      'Clear the Embed Code field first'
    )
  })

  it('rejects fileUrl set together with both other fields, naming both', () => {
    expect(validateFileURL(DROPBOX_URL, { siblingData: { url: SPOTIFY_URL, embedCode: RTS_SNIPPET } })).toBe(
      'Clear the Audio URL and Embed Code fields first'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/validators/audioFields.spec.ts`
Expected: FAIL — `validateFileURL` doesn't exist yet; messages don't match.

- [ ] **Step 3: Implement (full file replace)**

Replace the entire contents of `src/validators/audioFields.ts`:

```ts
import { IFRAME_ATTR, IFRAME_TAG } from '@/utils/audioEmbed'
import { isEmptyField, isEmbedHostAllowed } from '@/utils/embeds'

/**
 * Audio Embed Validation
 *
 * Validates the three mutually exclusive fields on the AudioEmbed block: a Spotify/Apple Music
 * URL, a raw allowlisted <iframe> embed code, or a direct https audio file URL.
 */

type AudioFieldName = 'url' | 'embedCode' | 'fileUrl'

const AUDIO_FIELD_LABELS: Record<AudioFieldName, string> = {
  url: 'Audio URL',
  embedCode: 'Embed Code',
  fileUrl: 'Audio File URL',
}

const EMPTY_MESSAGE = 'Please enter an audio URL, embed code, or audio file URL'

/**
 * Context passed by Payload to field validators for the AudioEmbed block's three fields.
 */
interface AudioFieldsContext {
  siblingData?: { url?: unknown; embedCode?: unknown; fileUrl?: unknown }
}

/**
 * Returns the names of sibling audio fields (excluding `self`) that are currently non-empty.
 */
function otherNonEmptyFields(
  self: AudioFieldName,
  siblingData: AudioFieldsContext['siblingData']
): AudioFieldName[] {
  return (['url', 'embedCode', 'fileUrl'] as const)
    .filter((name) => name !== self)
    .filter((name) => !isEmptyField(siblingData?.[name]))
}

/**
 * Builds a "Clear the X [and Y] field(s) first" message naming the conflicting sibling field(s).
 */
function conflictMessage(others: AudioFieldName[]): string {
  const labels = others.map((name) => AUDIO_FIELD_LABELS[name])
  const joined = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0]
  return `Clear the ${joined} field${others.length > 1 ? 's' : ''} first`
}

/**
 * Validates audio URLs for supported streaming platforms
 *
 * Supported platforms:
 * - Spotify: open.spotify.com/track/ID, open.spotify.com/album/ID, open.spotify.com/playlist/ID
 * - Apple Music: music.apple.com/.../album/..., music.apple.com/.../playlist/...
 *
 * Empty is allowed when a sibling field (embedCode or fileUrl) is set. Rejects if more than one
 * of the three fields is non-empty, naming the conflicting field(s).
 *
 * @param value - Audio URL to validate
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateAudioURL = (value: unknown, { siblingData }: AudioFieldsContext = {}): true | string => {
  const others = otherNonEmptyFields('url', siblingData)

  if (isEmptyField(value)) {
    return others.length > 0 ? true : EMPTY_MESSAGE
  }

  if (others.length > 0) {
    return conflictMessage(others)
  }

  if (typeof value !== 'string') return 'Please enter a valid audio URL'

  try {
    const url = new URL(value)

    const isSpotify =
      url.hostname === 'open.spotify.com' || url.hostname === 'spotify.com' || url.hostname === 'play.spotify.com'

    if (isSpotify) {
      const spotifyMatch = url.pathname.match(
        /^(?:\/intl-[a-z]{2})?\/(track|album|playlist|artist|show|episode)\/[a-zA-Z0-9]+/
      )
      if (!spotifyMatch) {
        return 'Please enter a valid Spotify URL (track, album, playlist, artist, show, or episode)'
      }
      return true
    }

    const isAppleMusic = url.hostname === 'music.apple.com' || url.hostname === 'geo.music.apple.com'

    if (isAppleMusic) {
      const appleMusicMatch = url.pathname.match(/\/[a-z]{2}\/(album|playlist)\/[^/]+\/[a-zA-Z0-9.]+/)
      if (!appleMusicMatch) {
        return 'Please enter a valid Apple Music URL (album or playlist)'
      }
      return true
    }

    return 'Please enter a valid Spotify or Apple Music URL'
  } catch {
    return 'Please enter a valid URL format'
  }
}

/**
 * Validates raw <iframe> embed codes (e.g. RTS) against the host allowlist.
 *
 * Empty is allowed when a sibling field (url or fileUrl) is set. Rejects if more than one of
 * the three fields is non-empty, naming the conflicting field(s).
 *
 * @param value - Raw iframe snippet string
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateEmbedCode = (value: unknown, { siblingData }: AudioFieldsContext = {}): true | string => {
  const others = otherNonEmptyFields('embedCode', siblingData)

  if (isEmptyField(value)) {
    return others.length > 0 ? true : EMPTY_MESSAGE
  }

  if (others.length > 0) {
    return conflictMessage(others)
  }

  if (typeof value !== 'string' || !IFRAME_TAG.test(value)) {
    return 'Please enter a valid embed code'
  }

  const tag = value.match(IFRAME_TAG)?.[0] ?? ''
  const srcMatch = tag.match(IFRAME_ATTR('src'))
  if (!srcMatch || !srcMatch[1]) return 'Please enter a valid embed code'

  let url: URL
  try {
    url = new URL(srcMatch[1])
  } catch {
    return 'Please enter a valid embed code'
  }

  if (url.protocol !== 'https:') return 'Please enter a valid embed code'

  if (!isEmbedHostAllowed(url.hostname)) return 'Embed iframe host is not allowed'

  return true
}

/**
 * Validates a direct audio file URL (e.g. a Dropbox share link). No extension or host
 * allowlist — restricted to `https:` only, since the value flows straight into `<audio src>`
 * and a raw `javascript:`/`data:` scheme would otherwise parse as a "valid URL".
 *
 * Empty is allowed when a sibling field (url or embedCode) is set. Rejects if more than one
 * of the three fields is non-empty, naming the conflicting field(s).
 *
 * @param value - Direct audio file URL to validate
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateFileURL = (value: unknown, { siblingData }: AudioFieldsContext = {}): true | string => {
  const others = otherNonEmptyFields('fileUrl', siblingData)

  if (isEmptyField(value)) {
    return others.length > 0 ? true : EMPTY_MESSAGE
  }

  if (others.length > 0) {
    return conflictMessage(others)
  }

  if (typeof value !== 'string') return 'Please enter a valid audio file URL'

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'Please enter a valid URL format'
  }

  if (url.protocol !== 'https:') return 'Please enter a valid audio file URL (https only)'

  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/validators/audioFields.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/validators/audioFields.ts src/validators/audioFields.spec.ts
git commit -m "feat(audio): add validateFileURL and enforce three-way field exclusivity"
```

---

### Task 7: Dropbox URL normalization

**Files:**
- Create: `src/utils/audio.ts`
- Test: `src/utils/audio.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/audio.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeAudioFileUrl } from './audio'

describe('normalizeAudioFileUrl', () => {
  it('converts a legacy dl=0 Dropbox link to dl=1', () => {
    expect(normalizeAudioFileUrl('https://www.dropbox.com/s/abc123/recording.mp3?dl=0')).toBe(
      'https://www.dropbox.com/s/abc123/recording.mp3?dl=1'
    )
  })

  it('preserves other query params on the new /scl/fi/ share format', () => {
    expect(normalizeAudioFileUrl('https://www.dropbox.com/scl/fi/abc/recording.mp3?rlkey=xyz&dl=0')).toBe(
      'https://www.dropbox.com/scl/fi/abc/recording.mp3?rlkey=xyz&dl=1'
    )
  })

  it('appends dl=1 when there is no query string at all', () => {
    expect(normalizeAudioFileUrl('https://www.dropbox.com/s/abc123/recording.mp3')).toBe(
      'https://www.dropbox.com/s/abc123/recording.mp3?dl=1'
    )
  })

  it('matches the bare dropbox.com host (no www)', () => {
    expect(normalizeAudioFileUrl('https://dropbox.com/s/abc123/recording.mp3?dl=0')).toBe(
      'https://dropbox.com/s/abc123/recording.mp3?dl=1'
    )
  })

  it('leaves an already-direct dl.dropboxusercontent.com link unchanged', () => {
    const direct = 'https://dl.dropboxusercontent.com/s/abc123/recording.mp3'
    expect(normalizeAudioFileUrl(direct)).toBe(direct)
  })

  it('leaves a non-Dropbox URL unchanged', () => {
    const external = 'https://example.com/audio/recording.mp3'
    expect(normalizeAudioFileUrl(external)).toBe(external)
  })

  it('returns malformed input unchanged rather than throwing', () => {
    expect(normalizeAudioFileUrl('not a url')).toBe('not a url')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/utils/audio.spec.ts`
Expected: FAIL — `src/utils/audio.ts` doesn't exist (module not found).

- [ ] **Step 3: Implement**

Create `src/utils/audio.ts`:

```ts
/**
 * Rewrites a pasted Dropbox share link to its direct-stream form so a native `<audio src>`
 * plays the raw file instead of Dropbox's HTML preview page.
 *
 * - Matches both `www.dropbox.com` and bare `dropbox.com` hosts, covering both the legacy
 *   `/s/...` and current `/scl/fi/...` Dropbox share URL shapes.
 * - Uses `URLSearchParams` to set `dl=1` without disturbing any other existing query params
 *   (e.g. `rlkey=...` on the newer share format), and appends `?dl=1` when there's no query
 *   string at all.
 * - Already-direct links (`dl.dropboxusercontent.com`) and any non-Dropbox URL pass through
 *   unchanged.
 * - Defensive: if the input isn't a parseable URL, it's returned unchanged rather than thrown.
 *
 * @param value - The raw URL string as pasted into the fileUrl field
 * @returns The normalized (or unchanged) URL string
 */
export function normalizeAudioFileUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }

  const isDropboxShareHost = url.hostname === 'www.dropbox.com' || url.hostname === 'dropbox.com'
  if (!isDropboxShareHost) return value

  url.searchParams.set('dl', '1')
  return url.toString()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/utils/audio.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/audio.ts src/utils/audio.spec.ts
git commit -m "feat(audio): add Dropbox share-link direct-stream normalizer"
```

---

### Task 8: Add `fileUrl` field to the AudioEmbed block config

**Files:**
- Modify: `src/blocks/AudioEmbed.ts`

There's no dedicated spec file for `src/blocks/AudioEmbed.ts` (it's a plain Payload block config object with no logic of its own to unit test beyond what Task 6/7's validators and Task 9's component test already cover) — this task is implementation-only, verified by the Task 9 component test and Task 11's migration/build steps.

- [ ] **Step 1: Implement**

Replace the entire contents of `src/blocks/AudioEmbed.ts`:

```ts
import type { Block } from 'payload'

import { normalizeAudioFileUrl } from '@/utils/audio'
import { validateAudioURL, validateEmbedCode, validateFileURL } from '@/validators/audioFields'

/**
 * Audio Embed Block Field Types
 */
export interface AudioEmbedBlockFields {
  url?: string
  embedCode?: string
  fileUrl?: string
}

/**
 * Audio Embed Block
 *
 * Embeds audio within rich text content. Exactly one of the three fields should be set:
 * - url: Spotify / Apple Music native embeds
 * - embedCode: raw <iframe> snippet from allowlisted providers (e.g. RTS)
 * - fileUrl: direct link to an audio file (e.g. a Dropbox share link), played with a native
 *   HTML5 <audio> element
 */
export const AudioEmbed: Block = {
  slug: 'audioEmbed',
  labels: {
    singular: {
      en: 'Audio Embed',
      de: 'Audio-Einbettung',
    },
    plural: {
      en: 'Audio Embeds',
      de: 'Audio-Einbettungen',
    },
  },
  admin: {
    // Payload's default block-name input in the lexical editor header has
    // an upstream focus-stealing bug: typing into it can drop the cursor
    // into the surrounding post content. blockName isn't used anywhere in
    // this app, so it's disabled here rather than exposing a broken input.
    disableBlockName: true,
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: false,
      label: {
        en: 'Audio URL',
        de: 'Audio-URL',
      },
      admin: {
        placeholder: 'https://open.spotify.com/track/... or https://music.apple.com/...',
        description: {
          en: 'Spotify or Apple Music URL (leave empty when using an embed code or audio file URL)',
          de: 'Spotify- oder Apple-Music-URL (bei Einbettungscode oder Audio-Datei-URL leer lassen)',
        },
        condition: (_, siblingData) => !siblingData?.embedCode && !siblingData?.fileUrl,
      },
      validate: validateAudioURL,
    },
    {
      name: 'embedCode',
      type: 'textarea',
      required: false,
      label: {
        en: 'Embed Code',
        de: 'Einbettungscode',
      },
      admin: {
        placeholder:
          '<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>',
        description: {
          en: 'Paste an <iframe> embed code from a supported provider (e.g. RTS). If the embed looks cropped or oversized on the site, edit the width/height values in the pasted code and save again.',
          de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RTS). Falls die Einbettung auf der Website abgeschnitten oder zu groß wirkt, die Werte für width/height im eingefügten Code anpassen und erneut speichern.',
        },
        condition: (_, siblingData) => !siblingData?.url && !siblingData?.fileUrl,
        rows: 4,
      },
      validate: validateEmbedCode,
    },
    {
      name: 'fileUrl',
      type: 'text',
      required: false,
      label: {
        en: 'Audio File URL',
        de: 'Audio-Datei-URL',
      },
      admin: {
        placeholder: 'https://www.dropbox.com/s/.../recording.mp3?dl=0',
        description: {
          en: 'Direct link to an audio file (e.g. Dropbox share link). Plays with a simple audio player. Leave the other two fields empty when using this.',
          de: 'Direktlink zu einer Audiodatei (z. B. Dropbox-Freigabelink). Wird mit einem einfachen Audioplayer abgespielt. Die anderen beiden Felder bei Verwendung leer lassen.',
        },
        condition: (_, siblingData) => !siblingData?.url && !siblingData?.embedCode,
      },
      validate: validateFileURL,
      hooks: {
        beforeChange: [
          ({ value }: { value?: string }) => (typeof value === 'string' && value ? normalizeAudioFileUrl(value) : value),
        ],
      },
    },
  ],
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No new type errors introduced by this file (existing unrelated errors, if any, are out of scope).

- [ ] **Step 3: Commit**

```bash
git add src/blocks/AudioEmbed.ts
git commit -m "feat(audio): add fileUrl field to AudioEmbed block"
```

---

### Task 9: Render `fileUrl` as a native `<audio>` player

**Files:**
- Modify: `src/components/blocks/AudioEmbed.tsx`
- Test: `src/components/blocks/AudioEmbed.spec.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/components/blocks/AudioEmbed.spec.tsx`, add these tests inside the existing `describe('AudioEmbed', ...)` block, right before the closing `})`:

```ts
  it('renders a native audio player for fileUrl', () => {
    render(<AudioEmbed fileUrl="https://www.dropbox.com/s/abc123/recording.mp3?dl=1" />)
    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio?.getAttribute('src')).toBe('https://www.dropbox.com/s/abc123/recording.mp3?dl=1')
    expect(audio?.hasAttribute('controls')).toBe(true)
  })

  it('renders a fallback download link inside the audio element', () => {
    render(<AudioEmbed fileUrl="https://www.dropbox.com/s/abc123/recording.mp3?dl=1" />)
    const link = screen.getByText('Download audio')
    expect(link.getAttribute('href')).toBe('https://www.dropbox.com/s/abc123/recording.mp3?dl=1')
  })

  it('prefers fileUrl over url/embedCode when multiple are somehow set', () => {
    render(
      <AudioEmbed
        fileUrl="https://www.dropbox.com/s/abc123/recording.mp3?dl=1"
        url="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
      />
    )
    expect(document.querySelector('audio')).not.toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('renders nothing when none of url, embedCode, or fileUrl is provided', () => {
    const { container } = render(<AudioEmbed />)
    expect(container).toBeEmptyDOMElement()
  })
```

Also update the existing `'renders nothing when neither url nor embedCode is provided'` test — it stays correct as-is (it renders `<AudioEmbed />` with no props at all, which still returns `null`), so no change is needed there; the new test above simply names the three-field case explicitly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/blocks/AudioEmbed.spec.tsx`
Expected: FAIL — `AudioEmbed` doesn't accept a `fileUrl` prop yet, no `<audio>` element is rendered.

- [ ] **Step 3: Implement**

In `src/components/blocks/AudioEmbed.tsx`, update the props interface and the top of the component (around lines 6-16):

```tsx
interface AudioEmbedProps {
  url?: string
  embedCode?: string
  fileUrl?: string
}

const AudioEmbed: React.FC<AudioEmbedProps> = ({ url, embedCode, fileUrl }) => {
  // Block was just inserted and none of the fields have been filled in yet - this
  // is expected (e.g. while editing in the live preview) and isn't an error.
  if (!url && !embedCode && !fileUrl) {
    return null
  }

  if (fileUrl) {
    return (
      <div className="my-8">
        <audio controls className="w-full" src={fileUrl}>
          <a href={fileUrl}>Download audio</a>
        </audio>
      </div>
    )
  }

  if (embedCode) {
```

(Everything from `if (embedCode) {` onward is unchanged — the new `fileUrl` branch is inserted before it, and `url` remains the final fallback branch.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/components/blocks/AudioEmbed.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/AudioEmbed.tsx src/components/blocks/AudioEmbed.spec.tsx
git commit -m "feat(audio): render fileUrl as a native audio player"
```

---

### Task 10: Wire `fileUrl` through the Lexical block converter

**Files:**
- Modify: `src/components/ui/PayloadRichText.tsx`

This file has no dedicated unit test for individual converter cases (it's covered by broader integration/rendering tests elsewhere in the app, out of scope to add here) — verify manually per Step 2.

- [ ] **Step 1: Implement**

In `src/components/ui/PayloadRichText.tsx`, update the `audioEmbed` converter case (around line 183):

```tsx
          audioEmbed: ({ node }: { node: SerializedLexicalNode & { fields: AudioEmbedBlockFields } }) => {
            const { url, embedCode, fileUrl } = node.fields
            return <AudioEmbed url={url} embedCode={embedCode} fileUrl={fileUrl} />
          },
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PayloadRichText.tsx
git commit -m "fix(audio): pass fileUrl through the Lexical block converter"
```

---

### Task 11: Generate and harden the Payload migration

**Files:**
- Create: `src/migrations/<generated-timestamp>_add_posts_unlisted_and_audio_file_url.ts` (exact filename determined by the CLI)
- Modify: `src/migrations/index.ts` (auto-updated by the CLI)
- Modify: `src/payload-generated-schema.ts` (auto-updated by the CLI)

Two new columns are being added to the deployed schema: `posts.unlisted` (boolean) and the `AudioEmbed` block's `file_url` (text, on its Lexical blocks table). Per `docs/patterns/payload.md`, dev's schema push is not a substitute for a real migration, and `build:ci` re-runs migrations on every build (including previews), so both `up()` and `down()` need idempotency guards.

- [ ] **Step 1: Generate the migration**

Run: `pnpm payload migrate:create add_posts_unlisted_and_audio_file_url`

This diffs the current Payload config (with the `unlisted` field on Posts from Task 1 and the `fileUrl` field on AudioEmbed from Task 8) against `src/payload-generated-schema.ts`, writes a new file into `src/migrations/`, and updates `src/migrations/index.ts` to register it.

- [ ] **Step 2: Inspect the generated file**

Open the newly created file. Note the exact table name Payload generated for the `AudioEmbed` block's columns (it will be named after the collection and block slug, e.g. `posts_blocks_audio_embed` — confirm the actual name from the generated `CREATE TABLE`/`ALTER TABLE` statements rather than assuming) and the exact column name Payload used for `unlisted` on `posts` (should be `unlisted`, matching the field's `name`) and for `fileUrl` on the block table (should be `file_url`, Payload's snake_case convention for camelCase field names).

- [ ] **Step 3: Add idempotency guards**

Edit the generated file so `up()` and `down()` are safe to re-run, following the exact pattern used in `src/migrations/20260912_191733_add_post_published_date.ts`. Add a guard function near the top of the file (adjust the table/column names to match what Step 2 found):

```ts
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(sql`SELECT COUNT(*) AS c FROM pragma_table_info('posts') WHERE name = 'unlisted'`)
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}
```

Then wrap the body of `up()`:

```ts
export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  // ... keep the generated ALTER TABLE / CREATE TABLE statements here ...
}
```

And the body of `down()`:

```ts
export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  // ... keep the generated reverse statements here ...
}
```

Also add `IF NOT EXISTS` to any generated `CREATE TABLE`/`CREATE INDEX` statement and `IF EXISTS` to any `DROP TABLE`/`DROP INDEX` statement that doesn't already have it, matching the project convention documented in `docs/patterns/payload.md`.

- [ ] **Step 4: Verify migration status**

Run: `pnpm payload migrate:status`
Expected: The new migration shows as pending (not yet applied) against the dev database.

- [ ] **Step 5: Commit**

```bash
git add src/migrations/ src/payload-generated-schema.ts
git commit -m "feat(db): add migration for posts.unlisted and AudioEmbed fileUrl"
```

---

### Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: All tests pass, including every file touched in Tasks 1-10.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No new lint errors.

- [ ] **Step 3: Run format check**

Run: `pnpm exec oxfmt --check src/collections/Posts.ts src/collections/Posts.test.ts src/services/post.ts src/services/post.spec.ts src/services/artist.ts src/services/artist.spec.ts src/app/sitemap.ts src/app/sitemap.spec.ts src/validators/audioFields.ts src/validators/audioFields.spec.ts src/utils/audio.ts src/utils/audio.spec.ts src/blocks/AudioEmbed.ts src/components/blocks/AudioEmbed.tsx src/components/blocks/AudioEmbed.spec.tsx src/components/ui/PayloadRichText.tsx`
Expected: No formatting differences. If there are, run `pnpm format` and review the diff before re-committing.

- [ ] **Step 4: Run the build**

Run: `pnpm build`
Expected: Build succeeds (this also runs the migration against whatever database `DATABASE_URI` in `.env` points at — confirm with the user this is the local `dev.db` before running, per this repo's database-protection policy).

- [ ] **Step 5: Manual smoke test (dev server)**

Run: `pnpm dev`, then in the admin UI:
1. Create or edit a post, check "Unlisted", save. Confirm it no longer appears on the `/news` or `/projects` listing page, and is absent from `/sitemap.xml`, but its direct URL (`/news/<slug>` or `/projects/<slug>`) still renders.
2. If the post is linked to an artist and categorized `projects`, confirm it no longer appears on that artist's "Projects" tab.
3. Add an `AudioEmbed` block to a post's content, paste a Dropbox share link (`?dl=0` or no `dl` param) into "Audio File URL", save, and reload the admin edit view — confirm the stored value now has `dl=1`. View the post on the live site and confirm a native audio player with controls renders and the file streams.
4. Try setting both "Audio URL" and "Audio File URL" on the same block via two browser tabs or by editing raw data — confirm save is rejected with a message naming the conflicting field.

Stop any dev server started for this smoke test when done, per this repo's tooling conventions.

- [ ] **Step 6: Final commit (if any smoke-test fixes were needed)**

Only if Step 5 uncovered an issue requiring a code change — otherwise no commit needed here, the plan is complete.

---

## Plan Self-Review Notes

- **Spec coverage:** every numbered section of the spec maps to a task — Field/Filtering/Artist leaks (Tasks 1-4), sitemap (Task 5), validators/three-way exclusivity/scheme check (Task 6), Dropbox normalization (Task 7), block config (Task 8), rendering (Task 9), converter (Task 10), migration (Task 11). The "Accepted risk" section requires no code change, so it has no task — verified intentional, not a gap.
- **Dead code audit** (the `getAll*` functions the spec says need no fix) is not a task since no code changes there — confirmed still correct after Tasks 1-10 since none of those functions were touched.
- **Type consistency check:** `includeUnlisted` option name used consistently across Task 2's `getFilteredPosts`/`getPaginatedPosts` signatures and tests. `AudioFieldsContext` type shared by all three validators in Task 6, matching the `AudioEmbedBlockFields` interface fields (`url`/`embedCode`/`fileUrl`) used in Tasks 8-10.
