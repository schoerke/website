# Recording Details Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a brand-consistent shadcn Dialog "details" modal to the artist recordings tab, exposing the rich-text `description` and `roles` fields that are currently never displayed.

**Architecture:** A self-contained client component `RecordingDetailsDialog` owns its open state and renders a shadcn `Dialog`. `RecordingListItem` conditionally renders a compact "Details" button (only when the recording has visible description text) that opens the dialog. A small `hasVisibleTextContent(content)` helper in `src/utils/lexical.ts` drives both the trigger condition and the modal body so empty rich-text blocks don't spawn empty modals.

**Tech Stack:** Next.js App Router, React 19, shadcn (`@radix-ui/react-dialog`), next-intl, Lexical rich text (`@payloadcms/richtext-lexical/react`), Tailwind. Tests via Vitest + Testing Library (happy-dom).

**Spec:** `docs/superpowers/specs/2026-08-20-recording-details-modal-design.md`

---

### Task 1: Add `hasVisibleTextContent` helper to lexical utils

**Files:**
- Modify: `src/utils/lexical.ts` (append helper near `extractLexicalText`)
- Test: `src/utils/lexical.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add a new describe block to `src/utils/lexical.spec.ts`. Import also needs updating, but for TDD write tests first referencing the not-yet-existing function.

```ts
import { describe, expect, it } from 'vitest'
import {
  extractLexicalImages,
  extractLexicalText,
  hasVisibleTextContent,
  lexicalToHtml,
  parseLexicalContent,
} from './lexical'
```

Append this describe block inside the top-level `describe('Lexical parsing utilities', ...)`:

```ts
describe('hasVisibleTextContent', () => {
  it('returns true when a paragraph has visible text', () => {
    const content = {
      root: {
        type: 'root',
        children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello world' }] }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
    expect(hasVisibleTextContent(content)).toBe(true)
  })

  it('returns false for null', () => {
    expect(hasVisibleTextContent(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(hasVisibleTextContent(undefined)).toBe(false)
  })

  it('returns false for an object with an empty children array', () => {
    const content = {
      root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
    }
    expect(hasVisibleTextContent(content)).toBe(false)
  })

  it('returns false when nodes contain only whitespace text', () => {
    const content = {
      root: {
        type: 'root',
        children: [{ type: 'paragraph', children: [{ type: 'text', text: '   \n ' }] }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
    expect(hasVisibleTextContent(content)).toBe(false)
  })

  it('returns true for deeply nested text', () => {
    const content = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'link', children: [{ type: 'text', text: 'Nested text' }] }],
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
    expect(hasVisibleTextContent(content)).toBe(true)
  })

  it('returns true even when an image node is present alongside text', () => {
    const content = {
      root: {
        type: 'root',
        children: [
          { type: 'upload', value: { url: '/api/images/file/x.jpg' } },
          { type: 'paragraph', children: [{ type: 'text', text: 'Caption' }] },
        ],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
    expect(hasVisibleTextContent(content)).toBe(true)
  })

  it('returns false when only an image node exists with no text', () => {
    const content = {
      root: {
        type: 'root',
        children: [{ type: 'upload', value: { url: '/api/images/file/x.jpg' } }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    }
    expect(hasVisibleTextContent(content)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/lexical.spec.ts -t hasVisibleTextContent`
Expected: FAIL — `hasVisibleTextContent` is not exported.

- [ ] **Step 3: Write the implementation**

Add this helper to `src/utils/lexical.ts`, near the other exported functions (after `parseLexicalContent` is defined; place it after `extractLexicalText` around line 144). It walks the node tree and returns true only if at least one text node has non-whitespace text.

```ts
/**
 * Returns true when the Lexical editor state contains at least one text node with
 * non-whitespace text. Used to distinguish "has content" from a Payload richText
 * field whose empty root block is a truthy object with no visible text.
 *
 * @param content - The Lexical editor state, or null/undefined
 * @returns True if there is any visible text, false otherwise
 *
 * @example
 * const has = hasVisibleTextContent(recording.description) // true/false
 */
export function hasVisibleTextContent(content: string | object | null | undefined): boolean {
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch {
      return true // Unparseable string at least signals non-empty stored data
    }
  }
  if (typeof content !== 'object' || content === null) return false

  const hasVisibleText = (node: unknown): boolean => {
    if (typeof node !== 'object' || node === null) return false
    const n = node as Record<string, unknown>

    if (typeof n.text === 'string' && n.text.trim().length > 0) return true
    if (Array.isArray(n.children)) return n.children.some(hasVisibleText)
    if (n.root && typeof n.root === 'object') return hasVisibleText(n.root)

    return false
  }

  return hasVisibleText(content)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/lexical.spec.ts`
Expected: PASS (all tests, including new ones and the existing suite — the new export is additive and existing tests are unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/utils/lexical.ts src/utils/lexical.spec.ts
git commit -m "feat: add hasVisibleTextContent lexical helper"
```

---

### Task 2: Add discography translations for the details + roles overline

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/de.ts`

- [ ] **Step 1: Add EN keys**

In `src/i18n/en.ts`, the `discography` block currently is (around lines 95-101):

```ts
discography: {
  listenOnSpotify: 'Listen on Spotify',
  listenOnAppleMusic: 'Listen on Apple Music',
  listenOnSpotifyFor: 'Listen to {title} on Spotify',
  listenOnAppleMusicFor: 'Listen to {title} on Apple Music',
  opensInNewTab: 'opens in new tab',
},
```

Add `details` and `roles` keys:

```ts
discography: {
  details: 'Details',
  roles: 'Roles',
  listenOnSpotify: 'Listen on Spotify',
  listenOnAppleMusic: 'Listen on Apple Music',
  listenOnSpotifyFor: 'Listen to {title} on Spotify',
  listenOnAppleMusicFor: 'Listen to {title} on Apple Music',
  opensInNewTab: 'opens in new tab',
},
```

- [ ] **Step 2: Add DE keys**

Open `src/i18n/de.ts`, find the same `discography` block, and mirror the additions with German copy (`details` stays "Details"; `roles` = "Mitwirkung"):

```ts
discography: {
  details: 'Details',
  roles: 'Mitwirkung',
  listenOnSpotify: 'Auf Spotify hören',
  listenOnAppleMusic: 'Auf Apple Music hören',
  listenOnSpotifyFor: '{title} auf Spotify hören',
  listenOnAppleMusicFor: '{title} auf Apple Music hören',
  opensInNewTab: 'wird in neuem Tab geöffnet',
},
```

Verify the DE file's existing streaming strings and keep them; only add `details` and `roles`. Match the existing style of the DE `discography` block exactly (adjust the assumed German strings above to whatever is already present — the requirement is only to ADD `details` and `roles`).

- [ ] **Step 3: Verify no type/lint break**

Run: `pnpm lint`
Expected: PASS (no type errors — `en.ts`/`de.ts` are typed against a keys schema; both must define the exact same keys).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/de.ts
git commit -m "feat: add recording details translation keys"
```

---

### Task 3: Build `RecordingDetailsDialog` component

**Files:**
- Create: `src/components/Recording/RecordingDetailsDialog.tsx`
- Create: `src/components/Recording/RecordingDetailsDialog.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Recording/RecordingDetailsDialog.spec.tsx`:

```tsx
// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import RecordingDetailsDialog from '@/components/Recording/RecordingDetailsDialog'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockImage, createMockRecording } from '@/tests/utils/payloadMocks'

// next/image is not available in happy-dom; mock it to a plain <img>.
vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}))

// Mock PayloadRichText so the rich-text renderer isn't exercised in unit tests.
vi.mock('@/components/ui/PayloadRichText', () => ({
  default: ({ content }: { content: { root: { children: { text?: string }[] } } }) => {
    const texts = content?.root?.children
      ? content.root.children
          .map((c) => (c as { text?: string }).text ?? '')
          .filter(Boolean)
          .join(' ')
      : ''
    return <div data-testid="rich-text">{texts}</div>
  },
}))

const messages = {
  custom: {
    pages: {
      artist: {
        discography: {
          details: 'Details',
          roles: 'Roles',
          listenOnSpotify: 'Listen on Spotify',
          listenOnAppleMusic: 'Listen on Apple Music',
          listenOnSpotifyFor: 'Listen to {title} on Spotify',
          listenOnAppleMusicFor: 'Listen to {title} on Apple Music',
          opensInNewTab: 'opens in new tab',
        },
      },
    },
    recordingRoles: {
      soloist: 'Soloist',
      conductor: 'Conductor',
    },
  },
}

function descriptionWithText(text: string) {
  return {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

function renderDialog(recording: ReturnType<typeof createMockRecording>) {
  return render(
    <NextIntlTestProvider messages={messages}>
      <RecordingDetailsDialog recording={recording} />
    </NextIntlTestProvider>
  )
}

describe('RecordingDetailsDialog', () => {
  it('renders the recording title', () => {
    renderDialog(createMockRecording({ title: 'Beethoven - Violin Concerto' }))
    expect(screen.getByText('Beethoven - Violin Concerto')).toBeInTheDocument()
  })

  it('renders roles via the recordingRoles translation namespace', () => {
    renderDialog(createMockRecording({ roles: ['soloist', 'conductor'] }))
    expect(screen.getByText('Soloist')).toBeInTheDocument()
    expect(screen.getByText('Conductor')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
  })

  it('omits the roles overline label when roles is empty', () => {
    renderDialog(createMockRecording({ roles: [] }))
    expect(screen.queryByText('Roles')).not.toBeInTheDocument()
  })

  it('renders metadata (year, label, catalog)', () => {
    renderDialog(
      createMockRecording({
        recordingLabel: 'Deutsche Grammophon',
        catalogNumber: 'DG 123456',
        recordingYear: 2020,
      })
    )
    expect(screen.getByText('Deutsche Grammophon')).toBeInTheDocument()
    expect(screen.getByText('DG 123456')).toBeInTheDocument()
    expect(screen.getByText('2020')).toBeInTheDocument()
  })

  it('renders the rich text description body', () => {
    renderDialog(createMockRecording({ description: descriptionWithText('Some program notes') }))
    expect(screen.getByTestId('rich-text')).toBeInTheDocument()
    expect(screen.getByText('Some program notes')).toBeInTheDocument()
  })

  it('renders Spotify and Apple Music links', () => {
    renderDialog(
      createMockRecording({
        title: 'Beethoven - Violin Concerto',
        spotifyURL: 'https://open.spotify.com/album/123',
        appleMusicURL: 'https://music.apple.com/album/123',
      })
    )
    expect(screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Spotify' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Listen to Beethoven - Violin Concerto on Apple Music' })
    ).toBeInTheDocument()
  })

  it('renders a placeholder when no cover art is present', () => {
    renderDialog(createMockRecording({ coverArt: undefined }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('recording-details-cover-placeholder')).toBeInTheDocument()
  })

  it('renders the cover image when coverArt is populated', () => {
    renderDialog(
      createMockRecording({ coverArt: createMockImage({ alt: 'Album cover', url: '/api/images/file/cover.jpg' }) })
    )
    const img = screen.getByRole('img', { name: 'Album cover' })
    expect(img).toHaveAttribute('src', expect.stringContaining('cover.jpg'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/Recording/RecordingDetailsDialog.spec.tsx`
Expected: FAIL — module not found (`RecordingDetailsDialog` doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/components/Recording/RecordingDetailsDialog.tsx`:

```tsx
'use client'

import { SiApplemusic, SiSpotify } from '@icons-pack/react-simple-icons'
import { Disc as DiscIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import React, { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PayloadRichText from '@/components/ui/PayloadRichText'
import type { Image as PayloadImage, Recording } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import { hasVisibleTextContent } from '@/utils/lexical'

interface RecordingDetailsDialogProps {
  recording: Recording
}

const RecordingDetailsDialog: React.FC<RecordingDetailsDialogProps> = ({ recording }) => {
  const t = useTranslations('custom.pages.artist.discography')
  const tRoles = useTranslations('custom.recordingRoles')
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const coverArt =
    typeof recording.coverArt === 'object' && recording.coverArt !== null
      ? (recording.coverArt as PayloadImage)
      : null
  const coverArtUrl = getValidImageUrl(recording.coverArt)

  const hasDescription = hasVisibleTextContent(recording.description ?? null)
  const metadata = [recording.recordingLabel, recording.catalogNumber, recording.recordingYear?.toString()].filter(
    Boolean
  )

  const roleLabels = recording.roles.map((role) => tRoles(role as Parameters<typeof tRoles>[0]))

  return (
    <>
      {/* Trigger — only shown when the recording has visible description text */}
      {hasDescription && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center text-sm text-gray-500 underline decoration-transparent underline-offset-4 transition duration-150 ease-in-out hover:text-gray-900 hover:decoration-primary-yellow focus:outline-none focus:ring-2 focus:ring-primary-yellow focus:ring-offset-2"
        >
          {t('details')}
        </button>
      )}

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && setOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-left text-2xl font-bold">
              {recording.title}
            </DialogTitle>
            <DialogDescription className="sr-only">{t('details')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 sm:grid-cols-[180px_1fr]">
            {/* Cover art / placeholder */}
            <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-md bg-gray-100 sm:mx-0 sm:w-full">
              {coverArtUrl && !imageFailed ? (
                <Image
                  src={coverArtUrl}
                  alt={coverArt?.alt || recording.title}
                  fill
                  sizes="(min-width: 640px) 180px, 160px"
                  className="object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  data-testid="recording-details-cover-placeholder"
                  aria-hidden="true"
                  className="flex h-full w-full items-center justify-center"
                >
                  <DiscIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              {roleLabels.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    {t('roles')}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{roleLabels.join(' • ')}</p>
                </div>
              )}

              {metadata.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Meta</p>
                  <p className="mt-1 text-sm text-gray-600">{metadata.join(' • ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {hasDescription && (
            <div className="prose max-w-prose divide-y divide-gray-200">
              <PayloadRichText content={recording.description} />
            </div>
          )}

          {/* Streaming links */}
          {(recording.spotifyURL || recording.appleMusicURL) && (
            <div className="flex flex-wrap items-center gap-6 border-t border-gray-200 pt-6">
              {recording.spotifyURL && (
                <a
                  href={recording.spotifyURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('listenOnSpotifyFor', { title: recording.title })}
                  className="inline-flex items-center gap-2 text-gray-600 transition duration-150 ease-in-out hover:text-gray-900"
                >
                  {t('listenOnSpotify')}
                  <SiSpotify width={20} height={20} aria-hidden="true" />
                  <span className="sr-only"> ({t('opensInNewTab')})</span>
                </a>
              )}
              {recording.appleMusicURL && (
                <a
                  href={recording.appleMusicURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('listenOnAppleMusicFor', { title: recording.title })}
                  className="inline-flex items-center gap-2 text-gray-600 transition duration-150 ease-in-out hover:text-gray-900"
                >
                  {t('listenOnAppleMusic')}
                  <SiApplemusic width={20} height={20} aria-hidden="true" />
                  <span className="sr-only"> ({t('opensInNewTab')})</span>
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RecordingDetailsDialog
```

Note: metadata/label text uses `text-gray-500` (the project's established silver-role convention — see
`RecordingListItem`/`ArtistTabContent`), and the yellow accent uses the configured `primary-yellow` token.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/Recording/RecordingDetailsDialog.spec.tsx`
Expected: PASS.

Fix `text-silver` if it isn't a real theme token by running lint below and switching to the configured color.

- [ ] **Step 5: Run lint + format**

Run: `pnpm lint && pnpm format`
Expected: PASS. Fix any import-order / formatting diffs.

- [ ] **Step 6: Commit**

```bash
git add src/components/Recording/RecordingDetailsDialog.tsx src/components/Recording/RecordingDetailsDialog.spec.tsx
git commit -m "feat: add recording details dialog"
```

---

### Task 4: Wire the trigger into `RecordingListItem`

**Files:**
- Modify: `src/components/Recording/RecordingListItem.tsx`
- Test: `src/components/Recording/RecordingListItem.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Append these tests to `src/components/Recording/RecordingListItem.spec.tsx` and update its `messages` mock to include `details`:

```ts
const messages = {
  custom: {
    pages: {
      artist: {
        discography: {
          details: 'Details',
          listenOnSpotify: 'Listen on Spotify',
          listenOnAppleMusic: 'Listen on Apple Music',
          opensInNewTab: 'opens in new tab',
          listenOnSpotifyFor: 'Listen to {title} on Spotify',
          listenOnAppleMusicFor: 'Listen to {title} on Apple Music',
        },
      },
    },
  },
}
```

Add a `descriptionWithText` helper and the new tests at the end of the describe block:

```ts
function descriptionWithText(text: string) {
  return {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
      direction: null,
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

// ...inside the describe block
it('renders the Details button when the description has visible text', () => {
  renderItem(createMockRecording({ description: descriptionWithText('Program notes here') }))
  expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
})

it('does not render the Details button when description is null', () => {
  renderItem(createMockRecording({ description: null }))
  expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
})

it('does not render the Details button when description is empty', () => {
  renderItem(
    createMockRecording({
      description: { root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } },
    })
  )
  expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
})

it('does not render the Details button when description is whitespace-only', () => {
  renderItem(createMockRecording({ description: descriptionWithText('   ') }))
  expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/Recording/RecordingListItem.spec.tsx`
Expected: FAIL — `Details` button not found (not yet implemented).

- [ ] **Step 3: Write the implementation**

Modify `src/components/Recording/RecordingListItem.tsx`:

1. Add imports at the top:

```ts
import RecordingDetailsDialog from '@/components/Recording/RecordingDetailsDialog'
import { hasVisibleTextContent } from '@/utils/lexical'
```

2. Inside the component, compute whether the details trigger is shown, and render the dialog + button. The streaming-links block and the new trigger should sit together in a right-aligned group. Replace the streaming-links wrapper block (currently lines 69-99) so that the "Details" button and streaming links share a flex container:

```tsx
<div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
  {/* Title + subtitle (unchanged) */}
  <div>
    <h3 className="font-playfair mb-1 text-lg font-bold">{recording.title}</h3>
    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
  </div>

  {/* Actions: details trigger + streaming links */}
  <div className="flex flex-wrap items-center gap-4">
    {hasVisibleTextContent(recording.description ?? null) && <RecordingDetailsDialog recording={recording} />}
    {(recording.spotifyURL || recording.appleMusicURL) && (
      <div className="flex gap-4">
        {/* existing Spotify + Apple Music link markup, unchanged */}
      </div>
    )}
  </div>
</div>
```

Keep all existing streaming-link markup exactly as-is (the `listenOnSpotify`/`listenOnAppleMusic` labels, `sr-only` new-tab suffix, icons). The only additions are the `RecordingDetailsDialog` import/usage and the wrapping `actions` flex container.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/Recording/RecordingListItem.spec.tsx`
Expected: PASS (all existing + 4 new tests).

The new dialog renders lazily (closed by default) so existing tests that render a row with no description are unaffected; rows with descriptions render a button that is not yet opened in these tests (the dialog content renders only when `open` is true).

- [ ] **Step 5: Run lint + format**

Run: `pnpm lint && pnpm format`
Expected: PASS.

- [ ] **Step 6: Run the full recording test suite**

Run: `pnpm vitest run src/components/Recording src/components/Artist/ArtistTabContent.spec.tsx`
Expected: PASS (confirms the tab integration and that `RoleFilter`/`RecordingList` aren't broken).

- [ ] **Step 7: Commit**

```bash
git add src/components/Recording/RecordingListItem.tsx src/components/Recording/RecordingListItem.spec.tsx
git commit -m "feat: add details trigger to recording list item"
```

---

### Task 5: Format, lint, and full test pass

**Files:**
- No source changes unless fixes required.

- [ ] **Step 1: Run formatter**

Run: `pnpm format`
Expected: PASS, no unexpected diffs (or apply prettier fixes).

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Run the test suite**

Run: `pnpm vitest run src/utils/lexical.spec.ts src/components/Recording src/components/Artist/ArtistTabContent.spec.tsx`
Expected: PASS.

- [ ] **Step 4: Run the build**

Run: `pnpm build`
Expected: PASS (confirms the client components and server components compile; no DB access is involved — build only, no migration).

- [ ] **Step 5: Verify final git state**

Run: `git status`
Expected: clean working tree (all changes committed). Review with `git log --oneline -6`.

---

## Self-Review Notes

- **Spec coverage:** trigger gating on visible text (Tasks 1 + 4), modal contents incl. roles via `custom.recordingRoles` + empty-array guard + metadata + description + streaming (Task 3), translations incl. roles overline label (Task 2), `max-w-prose` + `max-h` scroll + wider modal (Task 3), a11y `DialogTitle` present (Task 3), `<button>` semantics (Task 3), accepted roles-only gap + cover sizes nuance documented in spec (no code needed).
- **Type consistency:** `hasVisibleTextContent(content)` returns `boolean` and is imported in both `RecordingListItem` and `RecordingDetailsDialog`. Role keys typed via `Parameters<typeof tRoles>[0]`. The `roles` field is always `Recording['roles']` (array).
- **No placeholders:** every step has exact code, paths, and commands.
- **Resolved caveats:** the silver/muted color uses the established `text-gray-500` convention (verified against
  existing components), and the yellow accent uses `primary-yellow`. The DE `discography` block's existing
  strings (`listenOnSpotify: 'Auf Spotify anhören'`, etc.) were verified; Task 2 only adds `details`/`roles`.
