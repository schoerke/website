# Multi-Platform Video Embeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the YouTube-only `youtubeLinks` field with a unified `videoLinks` field that supports both YouTube and arte.tv embeds, sorted in a single list.

**Architecture:** Rename the Payload field from `youtubeLinks` → `videoLinks`, update the URL validator to accept both YouTube and arte.tv URLs, update the embed component to detect platform from URL and render the correct iframe src (YouTube embed URL or arte.tv embed URL with dynamic locale), migrate Olga Scheps' 2 existing videos via a script.

**Tech Stack:** Payload CMS (Local API), Next.js App Router, TypeScript, Vitest

---

## File Map

| File                                                 | Change                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/validators/fields.ts`                           | Replace `validateYouTubeURL` with `validateVideoURL` accepting YouTube + arte.tv |
| `src/validators/fields.spec.ts`                      | Update tests: rename + add arte.tv cases                                         |
| `src/collections/Artists.ts`                         | Rename field `youtubeLinks` → `videoLinks`, update labels/validator/placeholder  |
| `src/collections/components/YouTubeLinkRowLabel.tsx` | Rename file → `VideoLinkRowLabel.tsx`, update component name                     |
| `src/components/Artist/VideoAccordion.tsx`           | Add arte.tv ID extraction + locale-aware embed URL, update props type            |
| `src/components/Artist/ArtistTabContent.tsx`         | Update `MediaTabProps.videos` type reference from `youtubeLinks` → `videoLinks`  |
| `src/components/Artist/ArtistTabContent.spec.tsx`    | Update mock/type references                                                      |
| `src/components/Artist/ArtistTabs.tsx`               | Update field reference `artist.youtubeLinks` → `artist.videoLinks`               |
| `src/components/Artist/ArtistTabs.spec.tsx`          | Update test data field name                                                      |
| `src/components/Artist/ArtistGrid.spec.tsx`          | Update test data field name                                                      |
| `tmp/migrate-video-links.ts`                         | One-off migration script (deleted after use)                                     |

---

### Task 1: Replace validator — `validateYouTubeURL` → `validateVideoURL`

**Files:**

- Modify: `src/validators/fields.ts`
- Modify: `src/validators/fields.spec.ts`

- [ ] **Step 1: Update the failing tests first**

Replace the entire `describe('validateYouTubeURL', ...)` block in `src/validators/fields.spec.ts`. Also update the import at the top.

```typescript
import { validatePassword, validateQuote, validateURL, validateVideoURL } from './fields'

describe('validateVideoURL', () => {
  describe('YouTube URLs', () => {
    it('should accept standard youtube.com watch URL', () => {
      expect(validateVideoURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept youtube.com without www', () => {
      expect(validateVideoURL('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept youtu.be short URL', () => {
      expect(validateVideoURL('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept mobile youtube URLs (m.youtube.com)', () => {
      expect(validateVideoURL('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept YouTube URLs with hyphens in video ID', () => {
      expect(validateVideoURL('https://youtube.com/watch?v=abc-def-hij')).toBe(true)
    })

    it('should accept YouTube URLs with underscores in video ID', () => {
      expect(validateVideoURL('https://youtube.com/watch?v=abc_def_hij')).toBe(true)
    })

    it('should accept YouTube URLs with mixed alphanumeric IDs', () => {
      expect(validateVideoURL('https://youtube.com/watch?v=aB3-De_5XyZ')).toBe(true)
    })

    it('should accept http YouTube URLs', () => {
      expect(validateVideoURL('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })
  })

  describe('arte.tv URLs', () => {
    it('should accept arte.tv video URL (German)', () => {
      expect(
        validateVideoURL('https://www.arte.tv/de/videos/120894-000-A/thomas-hengelbrock-dirigiert-beethoven-und-faure/')
      ).toBe(true)
    })

    it('should accept arte.tv video URL (French)', () => {
      expect(validateVideoURL('https://www.arte.tv/fr/videos/120894-000-A/some-title/')).toBe(true)
    })

    it('should accept arte.tv video URL without trailing slash', () => {
      expect(validateVideoURL('https://www.arte.tv/de/videos/120894-000-A/some-title')).toBe(true)
    })

    it('should accept arte.tv video URL without title slug', () => {
      expect(validateVideoURL('https://www.arte.tv/de/videos/120894-000-A/')).toBe(true)
    })

    it('should reject arte.tv URLs without a video ID', () => {
      expect(validateVideoURL('https://www.arte.tv/de/videos/')).not.toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('should reject non-string types', () => {
      expect(validateVideoURL(123)).not.toBe(true)
      expect(validateVideoURL(null)).not.toBe(true)
      expect(validateVideoURL(undefined)).not.toBe(true)
      expect(validateVideoURL({})).not.toBe(true)
      expect(validateVideoURL([])).not.toBe(true)
    })

    it('should reject other video platforms', () => {
      expect(validateVideoURL('https://vimeo.com/123456789')).not.toBe(true)
      expect(validateVideoURL('https://dailymotion.com/video/xyz')).not.toBe(true)
      expect(validateVideoURL('https://google.com')).not.toBe(true)
    })

    it('should reject malformed URLs', () => {
      expect(validateVideoURL('not-a-url')).not.toBe(true)
      expect(validateVideoURL('youtube.com/watch?v=dQw4w9WgXcQ')).not.toBe(true)
    })

    it('should reject YouTube URLs with missing video ID', () => {
      expect(validateVideoURL('https://youtube.com/watch')).not.toBe(true)
      expect(validateVideoURL('https://youtube.com')).not.toBe(true)
      expect(validateVideoURL('https://youtu.be/')).not.toBe(true)
    })

    it('should reject YouTube URLs with invalid video ID length', () => {
      expect(validateVideoURL('https://youtube.com/watch?v=short')).not.toBe(true)
      expect(validateVideoURL('https://youtu.be/abc')).not.toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test src/validators/fields.spec.ts
```

Expected: failures on `validateVideoURL` (not exported yet)

- [ ] **Step 3: Replace the validator implementation**

In `src/validators/fields.ts`, replace the `validateYouTubeURL` function with `validateVideoURL`:

```typescript
/**
 * Validates video URLs for supported platforms: YouTube and arte.tv
 * YouTube: youtube.com/watch?v=ID, youtu.be/ID
 * arte.tv: arte.tv/{locale}/videos/{ID}/...
 */
export const validateVideoURL = (value: unknown): true | string => {
  if (typeof value !== 'string') return 'Please enter a valid video URL'

  try {
    const url = new URL(value)

    // YouTube
    const isYouTubeDomain =
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'youtube.com' ||
      url.hostname === 'youtu.be' ||
      url.hostname === 'm.youtube.com'

    if (isYouTubeDomain) {
      let videoId: string | null = null

      if (url.hostname.includes('youtu.be')) {
        videoId = url.pathname.slice(1).split('/')[0]
      } else {
        videoId = url.searchParams.get('v')
      }

      if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
        return 'Please enter a valid YouTube URL with a valid video ID'
      }

      return true
    }

    // arte.tv: pathname must be /{locale}/videos/{ID}/...
    const isArteDomain = url.hostname === 'www.arte.tv' || url.hostname === 'arte.tv'

    if (isArteDomain) {
      // pathname: /de/videos/120894-000-A/...
      const arteMatch = url.pathname.match(/^\/[a-z]{2}\/videos\/([^/]+)\/?/)
      if (!arteMatch || !arteMatch[1]) {
        return 'Please enter a valid arte.tv video URL'
      }
      return true
    }

    return 'Please enter a valid YouTube or arte.tv video URL'
  } catch {
    return 'Please enter a valid URL format'
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test src/validators/fields.spec.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/validators/fields.ts src/validators/fields.spec.ts
git commit -m "feat: replace validateYouTubeURL with validateVideoURL supporting arte.tv"
```

---

### Task 2: Rename Payload admin row label component

**Files:**

- Create: `src/collections/components/VideoLinkRowLabel.tsx`
- Delete: `src/collections/components/YouTubeLinkRowLabel.tsx`

- [ ] **Step 1: Create the renamed component**

Create `src/collections/components/VideoLinkRowLabel.tsx` with identical logic, just renamed:

```typescript
'use client'

import { useRowLabel } from '@payloadcms/ui'

const VideoLinkRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ label?: string | { de?: string; en?: string } }>()

  if (data?.label) {
    if (typeof data.label === 'object' && data.label !== null) {
      const labelValue = data.label.de || data.label.en || ''
      if (labelValue) {
        return <div>{labelValue}</div>
      }
    }

    if (typeof data.label === 'string' && data.label.trim()) {
      return <div>{data.label}</div>
    }
  }

  return <div>{`Video ${String(rowNumber).padStart(2, '0')}`}</div>
}

export default VideoLinkRowLabel
```

- [ ] **Step 2: Delete the old file**

```bash
rm src/collections/components/YouTubeLinkRowLabel.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/collections/components/VideoLinkRowLabel.tsx src/collections/components/YouTubeLinkRowLabel.tsx
git commit -m "refactor: rename YouTubeLinkRowLabel to VideoLinkRowLabel"
```

---

### Task 3: Update Payload Artists collection config

**Files:**

- Modify: `src/collections/Artists.ts`

- [ ] **Step 1: Update the import and field definition**

In `src/collections/Artists.ts`:

1. Find the import of `validateYouTubeURL` and replace with `validateVideoURL`:

```typescript
import { validateURL, validateVideoURL } from '../validators/fields'
```

2. Replace the entire `youtubeLinks` field block (lines ~369-406) with:

```typescript
{
  name: 'videoLinks',
  label: {
    en: 'Video Links',
    de: 'Video-Links',
  },
  type: 'array',
  labels: {
    singular: {
      en: 'Video',
      de: 'Video',
    },
    plural: {
      en: 'Videos',
      de: 'Videos',
    },
  },
  admin: {
    initCollapsed: true,
    components: {
      RowLabel: './collections/components/VideoLinkRowLabel',
    },
  },
  fields: [
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      label: 'Video URL',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'https://www.youtube.com/watch?v=... or https://www.arte.tv/de/videos/...',
        description: 'Supports YouTube and arte.tv URLs',
      },
      validate: validateVideoURL,
    },
  ],
},
```

- [ ] **Step 2: Commit**

```bash
git add src/collections/Artists.ts
git commit -m "feat: rename youtubeLinks to videoLinks in Artists collection, accept arte.tv URLs"
```

---

### Task 4: Update VideoAccordion embed component

**Files:**

- Modify: `src/components/Artist/VideoAccordion.tsx`

The component needs to:

1. Accept a `locale` prop
2. Detect whether a URL is YouTube or arte.tv
3. Build the correct embed src for each platform

- [ ] **Step 1: Rewrite VideoAccordion**

Replace the entire file content:

```typescript
'use client'

import { useState } from 'react'

interface VideoLink {
  label: string
  url: string
  id?: string | null
}

interface VideoAccordionProps {
  videos: VideoLink[]
  emptyMessage: string
  locale: string
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }

  return null
}

/**
 * Extract arte.tv video ID from watch URL:
 * - https://www.arte.tv/de/videos/120894-000-A/some-title/
 * Returns: { videoId: '120894-000-A' } or null
 */
function extractArteId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const isArteDomain = parsed.hostname === 'www.arte.tv' || parsed.hostname === 'arte.tv'
    if (!isArteDomain) return null

    const match = parsed.pathname.match(/^\/[a-z]{2}\/videos\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Build the embed iframe src for a video URL.
 * Returns null if the URL is not a supported platform.
 */
function buildEmbedSrc(url: string, locale: string): string | null {
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`
  }

  const arteId = extractArteId(url)
  if (arteId) {
    return `https://www.arte.tv/embeds/${locale}/${arteId}`
  }

  return null
}

const VideoAccordion: React.FC<VideoAccordionProps> = ({ videos, emptyMessage, locale }) => {
  const firstValidIndex = videos.findIndex((v) => buildEmbedSrc(v.url, locale) !== null)
  const [openIndex, setOpenIndex] = useState<number | null>(firstValidIndex >= 0 ? firstValidIndex : null)

  if (videos.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <ul className="space-y-0">
      {videos.map((video, index) => {
        const embedSrc = buildEmbedSrc(video.url, locale)
        const isOpen = openIndex === index
        const panelId = `video-panel-${video.id || index}`

        if (!embedSrc) {
          console.warn(`Unsupported video URL: ${video.url}`)
          return null
        }

        return (
          <li key={video.id || index} className="border-b border-gray-200 last:border-b-0">
            <button
              onClick={() => toggleAccordion(index)}
              className="flex w-full items-center justify-between py-3 text-left"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="font-playfair mb-1 text-lg font-bold">{video.label}</span>
              <svg
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div id={panelId} hidden={!isOpen} className="pb-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  src={embedSrc}
                  title={video.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default VideoAccordion
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Artist/VideoAccordion.tsx
git commit -m "feat: VideoAccordion supports arte.tv embeds with dynamic locale"
```

---

### Task 5: Update ArtistTabContent and ArtistTabs

**Files:**

- Modify: `src/components/Artist/ArtistTabContent.tsx`
- Modify: `src/components/Artist/ArtistTabs.tsx`

- [ ] **Step 1: Update MediaTabProps in ArtistTabContent**

In `src/components/Artist/ArtistTabContent.tsx`, update the `MediaTabProps` interface and `VideoAccordion` call:

Change line ~146:

```typescript
videos: Artist['videoLinks']
```

Add `locale` to the props interface:

```typescript
interface MediaTabProps {
  images: Artist['galleryImages']
  videos: Artist['videoLinks']
  emptyMessage: string
  locale: string
  initialSection?: MediaSection
  onSectionChange?: (section: MediaSection) => void
}
```

Update the destructure and `VideoAccordion` usage:

```typescript
export const MediaTab: React.FC<MediaTabProps> = ({
  images,
  videos,
  emptyMessage,
  locale,
  initialSection = 'images',
  onSectionChange,
}) => {
```

And the VideoAccordion call (line ~187):

```typescript
{section === 'videos' && <VideoAccordion videos={videos || []} emptyMessage={emptyMessage} locale={locale} />}
```

- [ ] **Step 2: Update ArtistTabs**

In `src/components/Artist/ArtistTabs.tsx`, find the `<MediaTab` usage (around line 209) and update:

```typescript
<MediaTab
  images={artist.galleryImages}
  videos={artist.videoLinks}
  emptyMessage={t('media.noVideos')}
  locale={locale}
  // ...any other existing props
/>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Artist/ArtistTabContent.tsx src/components/Artist/ArtistTabs.tsx
git commit -m "feat: wire videoLinks and locale through MediaTab to VideoAccordion"
```

---

### Task 6: Update tests

**Files:**

- Modify: `src/components/Artist/ArtistTabContent.spec.tsx`
- Modify: `src/components/Artist/ArtistTabs.spec.tsx`
- Modify: `src/components/Artist/ArtistGrid.spec.tsx`

- [ ] **Step 1: Update ArtistTabContent.spec.tsx**

Find and update these references:

1. The mock (line ~60) — update the type and add `locale` prop:

```typescript
vi.mock('./VideoAccordion', () => ({
  default: ({ videos, emptyMessage, locale }: { videos: Artist['videoLinks']; emptyMessage: string; locale: string }) => (
    <div data-testid="video-accordion" data-locale={locale}>
      {videos.map((v, i) => <div key={i}>{v.label}</div>)}
      {videos.length === 0 && emptyMessage}
    </div>
  ),
}))
```

2. Line ~297 — update test data field name and add locale to MediaTab usage:

```typescript
const mockVideos: Artist['videoLinks'] = [{ label: 'Performance 1', url: 'https://youtube.com/watch?v=abc123' }]
```

3. Any `<MediaTab` render calls in the spec — add `locale="de"` prop.

- [ ] **Step 2: Update ArtistTabs.spec.tsx**

Find occurrences of `youtubeLinks` (lines ~139, ~505) and rename to `videoLinks`.

- [ ] **Step 3: Update ArtistGrid.spec.tsx**

Find line ~86: `youtubeLinks: null` → `videoLinks: null`

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/Artist/ArtistTabContent.spec.tsx src/components/Artist/ArtistTabs.spec.tsx src/components/Artist/ArtistGrid.spec.tsx
git commit -m "test: update test references from youtubeLinks to videoLinks"
```

---

### Task 7: Data migration then schema change

> **CRITICAL ORDER:** Data migration MUST run before `Artists.ts` is updated. Updating the Artists collection config causes Payload to drop `artists_youtube_links` and create `artists_video_links` on next server start — data loss without migration first.

> Database: remote Turso dev database (`libsql://...` in `.env`)

- [ ] **Step 1: Write the data migration script**

Create `tmp/migrate-video-links.ts`:

```typescript
import 'dotenv/config'
import config from '@/payload.config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

const result = await payload.find({
  collection: 'artists',
  limit: 200,
  depth: 0,
})

for (const artist of result.docs) {
  const youtubeLinks = (artist as any).youtubeLinks
  if (youtubeLinks && youtubeLinks.length > 0) {
    console.log(`Migrating ${artist.name}: ${youtubeLinks.length} video(s)`)
    await payload.update({
      collection: 'artists',
      id: artist.id,
      data: {
        videoLinks: youtubeLinks,
      },
    })
    console.log(`  Done.`)
  }
}

console.log('Migration complete.')
process.exit(0)
```

- [ ] **Step 2: Run the data migration (while Artists.ts still has youtubeLinks)**

```bash
npx tsx tmp/migrate-video-links.ts
```

- [ ] **Step 3: Now update Artists.ts** (triggers schema change on next server start)

This is covered in Task 3 — execute Task 3 only after this step completes.

- [ ] **Step 4: Clean up**

```bash
rm tmp/migrate-video-links.ts
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: migrate youtubeLinks data to videoLinks before schema change"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite and lint**

```bash
pnpm test && pnpm lint
```

Expected: all pass, no errors

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: successful build, no type errors

- [ ] **Step 3: Smoke test in dev**

Start the dev server, navigate to an artist with videos (Olga Scheps), confirm YouTube videos still embed. Add a test arte.tv URL via the CMS admin and confirm it embeds correctly with the right locale.

- [ ] **Step 4: Commit if any cleanup needed**

```bash
git add .
git commit -m "chore: post-migration cleanup"
```
