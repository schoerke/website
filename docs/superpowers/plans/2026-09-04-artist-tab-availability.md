# Artist Tab Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render only artist profile tabs backed by content, including discography availability determined on the server.

**Architecture:** Add a small published-recording count service and use it in the artist detail page with existing page-level data. Pass explicit tab availability and valid media subsection flags to `ArtistTabs`, where canonical tab resolution handles empty and hashed states. Revalidate the artist subtree after recording changes so cached page availability stays current.

**Tech Stack:** Next.js App Router, React 19, Payload CMS Local API, next-intl, Vitest, Testing Library.

---

### Task 1: Add published recording availability query

**Files:**
- Modify: `src/services/recording.ts:65-107`
- Modify: `src/services/recording.spec.ts`

- [ ] **Step 1: Write failing service test**

Add a `describe('getRecordingCountByArtist')` test that mocks `payload.count`, calls `getRecordingCountByArtist(42, 'en')`, and asserts:

```ts
expect(payload.count).toHaveBeenCalledWith({
  collection: 'recordings',
  where: {
    artists: { contains: '42' },
    _status: { equals: 'published' },
  },
  locale: 'en',
})
expect(result).toBe(1)
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/services/recording.spec.ts`

Expected: FAIL because `getRecordingCountByArtist` is not exported.

- [ ] **Step 3: Implement count service**

Add after `getRecordingsByArtist`:

```ts
export const getRecordingCountByArtist = async (artistId: number, locale?: Exclude<LocaleCode, 'all'>): Promise<number> => {
  const payload = await getPayload({ config })
  const result = await payload.count({
    collection: 'recordings',
    where: {
      artists: { contains: artistId.toString() },
      _status: { equals: 'published' },
    },
    locale: locale || 'de',
  })
  return result.totalDocs
}
```

Document it with JSDoc matching `getNewsPostCountByArtist`. Do not add a fallback locale: current lazy recording query has none.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/services/recording.spec.ts`

Expected: PASS.

### Task 2: Revalidate artist pages after recording changes

**Files:**
- Create: `src/collections/hooks/revalidateRecording.ts`
- Create: `src/collections/hooks/revalidateRecording.spec.ts`
- Modify: `src/collections/Recordings.ts:1-9,204-210`

- [ ] **Step 1: Write failing hook tests**

Follow `revalidateRepertoire.spec.ts`. Mock `next/cache`; test both hooks call:

```ts
expect(revalidatePath).toHaveBeenCalledWith('/(frontend)/[locale]/artists', 'layout')
```

Test both hooks skip this call when `req.context.skipRevalidation` is true and return `doc`.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/collections/hooks/revalidateRecording.spec.ts`

Expected: FAIL because hook module does not exist.

- [ ] **Step 3: Implement revalidation hooks and register them**

Create hooks structurally identical to `revalidateRepertoire.ts`, with exports `revalidateRecordingOnChange` and `revalidateRecordingOnDelete`, log text naming recording change/delete. In `Recordings.ts`, import both hooks and register:

```ts
hooks: {
  afterChange: [revalidateRecordingOnChange],
  afterDelete: [revalidateRecordingOnDelete],
},
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test src/collections/hooks/revalidateRecording.spec.ts`

Expected: PASS.

### Task 3: Compute and pass availability from artist detail page

**Files:**
- Modify: `src/app/(frontend)/[locale]/artists/[slug]/page.tsx:1-44,102-103`
- Test: existing page test, if present; otherwise cover integration through `ArtistTabs.spec.tsx`

- [ ] **Step 1: Write failing tab test for server-provided availability**

In `ArtistTabs.spec.tsx`, render an artist with no biography, repertoire, or media, `hasRecordings={false}`, `hasNews={false}`, and `hasProjects={true}`. Assert Projects is the sole tab and active content. This establishes availability comes from props, rather than the component assuming tabs exist.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/components/Artist/ArtistTabs.spec.tsx`

Expected: FAIL because `hasRecordings` and other availability props do not exist.

- [ ] **Step 3: Add page-level availability calculation**

Import `getRecordingCountByArtist`, `getValidImageUrl`, `hasVisibleTextContent`, and `getVideoEmbedData`. Start `newsCount` and recording count concurrently after artist loads:

```ts
const [newsCount, recordingCount] = await Promise.all([
  getNewsPostCountByArtist(artist.id, locale as 'de' | 'en'),
  getRecordingCountByArtist(artist.id, locale as 'de' | 'en'),
])
```

Calculate booleans from rendered data:

```ts
const hasBiography = hasVisibleTextContent(artist.biography)
const hasRepertoire = (artist.repertoire ?? []).some(
  (item) => typeof item === 'object' && item !== null && hasVisibleTextContent(item.content)
)
const hasImages = (artist.galleryImages ?? []).some((item) => getValidImageUrl(item.image) !== null)
const hasVideos = (artist.videoLinks ?? []).some(
  (video) => Boolean(video.embedCode) || getVideoEmbedData(video.url ?? '') !== null
)
```

Pass `hasBiography`, `hasRepertoire`, `hasRecordings={recordingCount > 0}`, `hasImages`, and `hasVideos` into `ArtistTabs`, alongside existing News and Projects flags.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test src/components/Artist/ArtistTabs.spec.tsx`

Expected: PASS after Task 4 updates component props.

### Task 4: Restrict tabs and resolve canonical fallback states

**Files:**
- Modify: `src/components/Artist/ArtistTabs.tsx:76-147,223-327`
- Modify: `src/components/Artist/ArtistTabs.spec.tsx:154-176,222-270,998-1057`

- [ ] **Step 1: Write failing tab availability tests**

Add tests asserting:

```ts
expect(screen.queryByText('Biography')).not.toBeInTheDocument()
expect(screen.queryByText('Repertoire')).not.toBeInTheDocument()
expect(screen.queryByText('Discography')).not.toBeInTheDocument()
expect(screen.queryByText('Media')).not.toBeInTheDocument()
```

when respective flags are false. Also assert a component with all flags false renders no `tablist`, `combobox`, or `tabpanel`; `#discography` falls back to first available tab; and `#media-images` selects Videos where only `hasVideos` is true.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test src/components/Artist/ArtistTabs.spec.tsx`

Expected: FAIL because only News and Projects influence the available tabs.

- [ ] **Step 3: Implement availability-driven tabs**

Expand `ArtistTabsProps` with five boolean flags. Replace `getAvailableTabs` with a function accepting all seven availability flags and filtering canonical order:

```ts
const tabAvailability: Record<TabId, boolean> = {
  biography: hasBiography,
  repertoire: hasRepertoire,
  discography: hasRecordings,
  media: hasImages || hasVideos,
  news: hasNews,
  projects: hasProjects,
}
return (['biography', 'repertoire', 'discography', 'media', 'news', 'projects'] as TabId[]).filter(
  (tab) => tabAvailability[tab]
)
```

Change `resolveTabState` to accept `tabs`, `hasImages`, and `hasVideos`. Its fallback is `tabs[0]`; when resolving Media, use Images when available, otherwise Videos. Preserve current hash behavior. Compute tabs once in the component, use same inputs in the hash effect, and return `null` before controls when `tabs.length === 0`.

- [ ] **Step 4: Update existing test fixtures**

Make `createMockArtist` use visible biography text only where biography behavior is intended. Add a `createTabProps` helper returning all availability flags as true; update every `ArtistTabs` render to spread it, overriding per test. Replace tests asserting all six static tabs with assertions for the intended availability fixture.

- [ ] **Step 5: Run tab tests to verify pass**

Run: `pnpm test src/components/Artist/ArtistTabs.spec.tsx`

Expected: PASS.

### Task 5: Format and verify full change

**Files:**
- Modify: files from Tasks 1-4

- [ ] **Step 1: Format changed files**

Run: `pnpm exec oxfmt --write src/services/recording.ts src/services/recording.spec.ts src/collections/Recordings.ts src/collections/hooks/revalidateRecording.ts src/collections/hooks/revalidateRecording.spec.ts 'src/app/(frontend)/[locale]/artists/[slug]/page.tsx' src/components/Artist/ArtistTabs.tsx src/components/Artist/ArtistTabs.spec.tsx`

- [ ] **Step 2: Run focused tests**

Run: `pnpm test src/services/recording.spec.ts src/collections/hooks/revalidateRecording.spec.ts src/components/Artist/ArtistTabs.spec.tsx`

Expected: PASS.

- [ ] **Step 3: Run static verification**

Run: `pnpm lint && pnpm typecheck`

Expected: both commands exit 0.

- [ ] **Step 4: Review worktree**

Run: `git diff --check && git diff -- src/services/recording.ts src/collections/Recordings.ts src/collections/hooks/revalidateRecording.ts 'src/app/(frontend)/[locale]/artists/[slug]/page.tsx' src/components/Artist/ArtistTabs.tsx`

Expected: no whitespace errors; diff limited to planned behavior.

- [ ] **Step 5: Request user verification and commit approval**

Do not stage or commit. Report verification results and wait for explicit user approval, per repository policy.
