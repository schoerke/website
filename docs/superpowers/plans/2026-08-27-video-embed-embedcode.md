# VideoEmbed Generic Embed Code (`embedCode` field) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `embedCode` field to the `VideoEmbed` block so editors can paste an `<iframe>` embed snippet from allowlisted broadcaster hosts (RSI, ARD Mediathek, RTS), mirroring the existing `AudioEmbed` block.

**Architecture:** Mirror `AudioEmbed` exactly. Add `embedCode` textarea to the `VideoEmbed` block config with mutual exclusion against `url`. Add a sync `validateVideoEmbedCode` validator (hardcoded code allowlist, no DB). Extend `ALLOWED_EMBED_HOSTS` with `rsi.ch` and `ardmediathek.de`. Render the embedCode branch via `parseIframeEmbed` with defense-in-depth, explicit width/height (video gets `allowFullScreen`). No migration (block fields are JSON in the richText `content` column — verified: 0 references in `payload-generated-schema.ts`/baseline migration; precedent commit `39156dc` added AudioEmbed embedCode with no migration).

**Tech Stack:** Payload 3.88 (blocks, field validators), React 19 / Next 16 client components, vitest + happy-dom, Turso/SQLite.

**Spec:** `docs/superpowers/specs/2026-08-27-video-embed-code-design.md`

---

## File Map

- **Create:** `src/validators/videoFields.ts` — `validateVideoEmbedCode` (mirror `audioFields.ts`)
- **Create:** `src/validators/videoFields.spec.ts` — validator tests
- **Create:** `src/components/blocks/VideoEmbed.spec.tsx` — render tests (new file, doesn't exist)
- **Modify:** `src/utils/embeds.ts` — extend `ALLOWED_EMBED_HOSTS`
- **Modify:** `src/utils/embeds.spec.ts` — add `rsi.ch`/`ardmediathek.de` cases
- **Modify:** `src/validators/fields.ts` — `validateVideoURL` signature + empty-allowed-when-embedCode
- **Modify:** `src/validators/fields.spec.ts` — regression for shared `validateVideoURL`
- **Modify:** `src/blocks/VideoEmbed.ts` — add `embedCode` field, `url` optional
- **Modify:** `src/components/blocks/VideoEmbed.tsx` — `embedCode` render branch
- **Modify:** `src/components/ui/PayloadRichText.tsx` — pass `embedCode` through

All on feature branch `feat/video-embed-embedcode` (already created, spec committed).

---

### Task 1: Extend the embed host allowlist

**Files:**
- Modify: `src/utils/embeds.ts:1`
- Test: `src/utils/embeds.spec.ts`

- [ ] **Step 1: Write failing test for new hosts**

Append to `src/utils/embeds.spec.ts` inside the existing `describe('isEmbedHostAllowed', ...)` block:

```ts
it('allows rsi.ch (RSI) and its subdomains', () => {
  expect(isEmbedHostAllowed('rsi.ch')).toBe(true)
  expect(isEmbedHostAllowed('www.rsi.ch')).toBe(true)
})

it('allows ardmediathek.de (ARD Mediathek) and its subdomains', () => {
  expect(isEmbedHostAllowed('ardmediathek.de')).toBe(true)
  expect(isEmbedHostAllowed('www.ardmediathek.de')).toBe(true)
  expect(isEmbedHostAllowed('api.ardmediathek.de')).toBe(true)
})

it('rejects lookalikes of the new hosts', () => {
  expect(isEmbedHostAllowed('rsi-ch.com')).toBe(false)
  expect(isEmbedHostAllowed('rsi.ch.evil.com')).toBe(false)
  expect(isEmbedHostAllowed('ardmediathek.de.evil.com')).toBe(false)
  expect(isEmbedHostAllowed('ardmediathek.com')).toBe(false)
})

it('keeps rts.ch allowlisted', () => {
  expect(isEmbedHostAllowed('rts.ch')).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/utils/embeds.spec.ts`
Expected: FAIL — new-host assertions return `false` for `rsi.ch`/`ardmediathek.de`.

- [ ] **Step 3: Extend the allowlist**

In `src/utils/embeds.ts:1`, change:

```ts
export const ALLOWED_EMBED_HOSTS = ['rts.ch'] as const
```

to:

```ts
export const ALLOWED_EMBED_HOSTS = ['rts.ch', 'rsi.ch', 'ardmediathek.de'] as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/utils/embeds.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/embeds.ts src/utils/embeds.spec.ts
git commit -m "feat(embeds): allow rsi.ch and ardmediathek.de iframe hosts"
```

---

### Task 2: `validateVideoEmbedCode` validator

**Files:**
- Create: `src/validators/videoFields.ts`
- Create: `src/validators/videoFields.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/validators/videoFields.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateVideoEmbedCode } from './videoFields'

const RSI_SNIPPET = `<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761" width="392" height="58" allowfullscreen></iframe>`

describe('validateVideoEmbedCode', () => {
  it('accepts an iframe snippet from an allowlisted host', () => {
    expect(validateVideoEmbedCode(RSI_SNIPPET)).toBe(true)
  })

  it('accepts a snippet from a subdomain of an allowlisted host', () => {
    expect(validateVideoEmbedCode('<iframe src="https://www.ardmediathek.de/embed/Y3JpZDovL2FyZC5kZS92aWRlby0xNjA4Nw?clientType=ardde"></iframe>')).toBe(
      true
    )
  })

  it('accepts rts.ch iframes (shared with audio)', () => {
    expect(validateVideoEmbedCode('<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>')).toBe(true)
  })

  it('rejects an iframe from a non-allowlisted host', () => {
    expect(validateVideoEmbedCode('<iframe src="https://evil.example.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects a lookalike host', () => {
    expect(validateVideoEmbedCode('<iframe src="https://rsi-ch.evil.com/x"></iframe>')).toBe(
      'Embed iframe host is not allowed'
    )
  })

  it('rejects text that is not an iframe', () => {
    expect(validateVideoEmbedCode('just some text')).toBe('Please enter a valid embed code')
    expect(validateVideoEmbedCode('<div>hi</div>')).toBe('Please enter a valid embed code')
  })

  it('rejects a snippet without src', () => {
    expect(validateVideoEmbedCode('<iframe width="392"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('validates the real src, not a data-src attribute', () => {
    expect(
      validateVideoEmbedCode('<iframe data-src="https://www.rsi.ch/x" src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
    expect(
      validateVideoEmbedCode('<iframe data-src="https://evil.example.com/x" src="https://www.rsi.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects non-https src', () => {
    expect(validateVideoEmbedCode('<iframe src="http://rsi.ch/play/embed?urn=x"></iframe>')).toBe(
      'Please enter a valid embed code'
    )
  })

  it('rejects javascript and data URLs', () => {
    expect(validateVideoEmbedCode('<iframe src="javascript:alert(1)"></iframe>')).toBe('Please enter a valid embed code')
    expect(validateVideoEmbedCode('<iframe src="data:text/html,x"></iframe>')).toBe('Please enter a valid embed code')
  })

  it('accepts an empty embed code when sibling url is present', () => {
    expect(
      validateVideoEmbedCode('', { siblingData: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } })
    ).toBe(true)
  })

  it('rejects an empty embed code when sibling url is also empty', () => {
    expect(validateVideoEmbedCode('', { siblingData: { url: '' } })).toBe(
      'Please enter either a video URL or an embed code'
    )
  })

  it('rejects non-string values', () => {
    expect(validateVideoEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateVideoEmbedCode(null)).toBe('Please enter either a video URL or an embed code')
    expect(validateVideoEmbedCode(undefined)).toBe('Please enter either a video URL or an embed code')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/validators/videoFields.spec.ts`
Expected: FAIL — module `./videoFields` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/validators/videoFields.ts`:

```ts
import { IFRAME_ATTR, IFRAME_TAG } from '@/utils/audioEmbed'
import { ALLOWED_EMBED_HOSTS, isEmbedHostAllowed } from '@/utils/embeds'

/**
 * Context passed by Payload to field validators
 */
interface VideoEmbedCodeContext {
  siblingData?: { url?: unknown; embedCode?: unknown }
}

/**
 * Returns true when a field value is effectively empty (missing or whitespace-only)
 */
const isEmptyVideoField = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * Validates raw <iframe> embed codes (e.g. RSI, ARD Mediathek, RTS) against the
 * code-hardcoded host allowlist.
 *
 * An empty embed code is allowed when a url is set on the sibling field.
 *
 * @param value - Raw iframe snippet string
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateVideoEmbedCode = (value: unknown, { siblingData }: VideoEmbedCodeContext = {}): true | string => {
  const siblingUrl = siblingData?.url

  if (isEmptyVideoField(value) && typeof siblingUrl === 'string' && siblingUrl.trim() !== '') {
    return true
  }

  if (isEmptyVideoField(value)) {
    return 'Please enter either a video URL or an embed code'
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

  if (!isEmbedHostAllowed(url.hostname, ALLOWED_EMBED_HOSTS)) return 'Embed iframe host is not allowed'

  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/validators/videoFields.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/validators/videoFields.ts src/validators/videoFields.spec.ts
git commit -m "feat(validators): add validateVideoEmbedCode for embedCode iframes"
```

---

### Task 3: Update `validateVideoURL` to allow empty when `embedCode` is set

**Files:**
- Modify: `src/validators/fields.ts:13-43`
- Test: `src/validators/fields.spec.ts`

- [ ] **Step 1: Write failing test**

Append to `src/validators/fields.spec.ts` inside the existing `describe('validateVideoURL', ...)` block:

```ts
it('accepts an empty url when sibling embedCode is present', () => {
  expect(validateVideoURL('', { siblingData: { embedCode: '<iframe src="https://www.rsi.ch/x"></iframe>' } })).toBe(true)
})

it('accepts an undefined url when sibling embedCode is present', () => {
  expect(validateVideoURL(undefined, { siblingData: { embedCode: '<iframe src="https://www.rsi.ch/x"></iframe>' } })).toBe(
    true
  )
})

it('rejects an empty url when sibling embedCode is also empty', () => {
  expect(validateVideoURL('', { siblingData: { embedCode: '' } })).toBe(
    'Please enter either a video URL or an embed code'
  )
})

it('rejects an empty url with no sibling context (Artists array-item contract unchanged)', () => {
  expect(validateVideoURL('')).toBe('Please enter a valid video URL')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/validators/fields.spec.ts`
Expected: FAIL — the first two assertions error because `validateVideoURL` takes a single `(value)` arg and ignores the second; empty string hits the `typeof` reject.

- [ ] **Step 3: Update implementation**

Replace `validateVideoURL` in `src/validators/fields.ts` (lines 8-43) with:

```ts
/**
 * Context passed by Payload to field validators
 */
interface VideoURLContext {
  siblingData?: { url?: unknown; embedCode?: unknown }
}

/**
 * Returns true when a field value is effectively empty (missing or whitespace-only)
 */
const isEmptyVideoField = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * Validates video URLs for supported platforms: YouTube and arte.tv
 * YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live|embed|shorts/ID
 * arte.tv: arte.tv/{locale}/videos/{ID}/...
 *
 * An empty url is allowed when an embed code is set on the sibling field.
 */
export const validateVideoURL = (value: unknown, { siblingData }: VideoURLContext = {}): true | string => {
  const embedCode = siblingData?.embedCode

  // Empty url is fine when an embed code is set on the sibling field
  if (isEmptyVideoField(value) && typeof embedCode === 'string' && embedCode.trim() !== '') {
    return true
  }

  if (isEmptyVideoField(value)) {
    return 'Please enter either a video URL or an embed code'
  }

  if (typeof value !== 'string') return 'Please enter a valid video URL'

  try {
    const url = new URL(value)

    // YouTube
    if (extractYouTubeVideoId(value)) {
      return true
    }

    if (YOUTUBE_HOSTS.includes(url.hostname)) {
      return 'Please enter a valid YouTube URL with a valid video ID'
    }

    // arte.tv: pathname must be /{locale}/videos/{ID}/...
    const isArteDomain = url.hostname === 'www.arte.tv' || url.hostname === 'arte.tv'

    if (isArteDomain) {
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

- [ ] **Step 4: Run full fields test to verify no regressions**

Run: `pnpm exec vitest run src/validators/fields.spec.ts`
Expected: PASS (all existing + new cases). The Artists `videoLinks` array-item context passes `{ label, url }` as siblingData — no `embedCode` key, so empty `url` still rejects, preserving Artists behavior (existing single-arg calls default to `{}`).

- [ ] **Step 5: Commit**

```bash
git add src/validators/fields.ts src/validators/fields.spec.ts
git commit -m "feat(validators): allow empty video URL when embed code is set"
```

---

### Task 4: Add `embedCode` field to VideoEmbed block

**Files:**
- Modify: `src/blocks/VideoEmbed.ts`

- [ ] **Step 1: Update the fields interface**

In `src/blocks/VideoEmbed.ts`, change `VideoEmbedBlockFields` (lines 8-11) to:

```ts
export interface VideoEmbedBlockFields {
  url?: string
  embedCode?: string
  aspectRatio?: '16:9' | '4:3' | '21:9'
}
```

- [ ] **Step 2: Update the `url` field**

In `src/blocks/VideoEmbed.ts`, update the `url` field (lines 43-59). Change `required: true` → `required: false`, add an `admin.condition` for mutual exclusion, and update the `validate` + description to mention embed code:

```ts
    {
      name: 'url',
      type: 'text',
      required: false,
      label: {
        en: 'Video URL',
        de: 'Video-URL',
      },
      admin: {
        placeholder: 'arte.tv/de/videos/...',
        description: {
          en: 'YouTube or arte.tv URL (leave empty when using an embed code)',
          de: 'YouTube- oder arte.tv-URL (bei Einbettungscode leer lassen)',
        },
        condition: (_, siblingData) => !siblingData?.embedCode,
      },
      validate: validateVideoURL,
    },
```

- [ ] **Step 3: Add the `embedCode` field**

In `src/blocks/VideoEmbed.ts`, insert the `embedCode` field after the `url` field (after line 59), before the closing `],` of `fields`. Update the import at line 3 to add `validateVideoEmbedCode`:

```ts
import { validateVideoEmbedCode, validateVideoURL } from '@/validators/fields'
```

Wait — `validateVideoEmbedCode` lives in `src/validators/videoFields.ts`, not `fields.ts`. Fix the import at line 3 to:

```ts
import { validateVideoURL } from '@/validators/fields'
import { validateVideoEmbedCode } from '@/validators/videoFields'
```

Then add the field:

```ts
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
          '<iframe src="https://www.ardmediathek.de/embed/Y3JpZDovL2FyZC5kZS92aWRlby0xNjA4Nw?clientType=ardde" width="100%" height="315" allowfullscreen></iframe>',
        description: {
          en: 'Paste an <iframe> embed code from a supported provider (e.g. RSI, ARD Mediathek, RTS). If the embed looks cropped or oversized on the site, edit the width/height values in the pasted code and save again.',
          de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RSI, ARD Mediathek, RTS). Falls die Einbettung auf der Website abgeschnitten oder zu groß wirkt, die Werte für width/height im eingefügten Code anpassen und erneut speichern.',
        },
        condition: (_, siblingData) => !siblingData?.url,
        rows: 4,
      },
      validate: validateVideoEmbedCode,
    },
```

- [ ] **Step 4: Update the block JSDoc**

Update the block doc comment (lines 13-22) to document the `embedCode` path:

```ts
/**
 * Video Embed Block
 *
 * Allows embedding videos within rich text content, either by URL or by pasting
 * a provider-supplied <iframe> embed code.
 *
 * URL path (uses validateVideoURL):
 * - YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/live|embed|shorts/ID
 * - arte.tv: arte.tv/{locale}/videos/{ID}/...
 *
 * Embed code path (uses validateVideoEmbedCode):
 * - raw <iframe> snippet from an allowlisted host (rts.ch, rsi.ch, ardmediathek.de)
 */
```

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 6: Commit**

```bash
git add src/blocks/VideoEmbed.ts
git commit -m "feat(blocks): add embedCode field to VideoEmbed block"
```

---

### Task 5: Render the `embedCode` branch in VideoEmbed

**Files:**
- Modify: `src/components/blocks/VideoEmbed.tsx`
- Create: `src/components/blocks/VideoEmbed.spec.tsx`

- [ ] **Step 1: Write the failing render test**

Create `src/components/blocks/VideoEmbed.spec.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import VideoEmbed from './VideoEmbed'

describe('VideoEmbed', () => {
  beforeAll(() => {
    // Mock iframe element to prevent happy-dom network requests
    const originalCreateElement = document.createElement.bind(document)
    document.createElement = function (tagName: string, options?: ElementCreationOptions) {
      if (tagName.toLowerCase() === 'iframe') {
        const div = originalCreateElement('div', options) as unknown as HTMLIFrameElement
        div.setAttribute('data-mock-iframe', 'true')
        Object.defineProperty(div, 'src', {
          get() {
            return this.getAttribute('src') || ''
          },
          set(value: string) {
            this.setAttribute('src', value)
          },
        })
        Object.defineProperty(div, 'allow', {
          get() {
            return this.getAttribute('allow') || ''
          },
          set(value: string) {
            this.setAttribute('allow', value)
          },
        })
        return div
      }
      return originalCreateElement(tagName, options)
    }
  })

  it('renders a YouTube iframe from a url', () => {
    render(<VideoEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
    const iframe = screen.getByTitle('youtube video player')
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('renders an iframe from an embedCode snippet', () => {
    const code =
      '<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761" width="392" height="220" title="Orchestra della Svizzera Italiana"></iframe>'
    render(<VideoEmbed embedCode={code} />)
    const iframe = screen.getByTitle('Orchestra della Svizzera Italiana')
    expect(iframe.getAttribute('src')).toBe('https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761')
    expect(iframe.getAttribute('width')).toBe('100%')
    expect(iframe.getAttribute('height')).toBe('220')
  })

  it('uses width 100% and a default height when embedCode has no dimensions', () => {
    render(<VideoEmbed embedCode='<iframe src="https://www.ardmediathek.de/embed/Y3JpZDovL2FyZC5kZS92aWRlby0xNjA4Nw"></iframe>' />)
    const iframe = screen.getByTitle('Video player')
    expect(iframe.getAttribute('width')).toBe('100%')
    expect(iframe.getAttribute('height')).toBe('315')
  })

  it('adds fullscreen support for video embeds', () => {
    render(<VideoEmbed embedCode='<iframe src="https://www.rsi.ch/play/embed?urn=x"></iframe>' />)
    const iframe = screen.getByTitle('Video player')
    expect(iframe.getAttribute('allowfullscreen')).not.toBeNull()
    expect(iframe.getAttribute('allow')).toContain('fullscreen')
  })

  it('discards junk attributes and uses hardened sandbox/allow', () => {
    const code =
      '<iframe src="https://www.rsi.ch/x" width="392" height="220" title="X" onload="alert(1)" sandbox="allow-top-navigation" name="junk"></iframe>'
    render(<VideoEmbed embedCode={code} />)
    const iframe = screen.getByTitle('X')
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox')
    expect(iframe.getAttribute('onload')).toBeNull()
    expect(iframe.getAttribute('name')).toBeNull()
    expect(iframe.getAttribute('src')).toBe('https://www.rsi.ch/x')
  })

  it('refuses to render non-http(s) embed srcs', () => {
    render(<VideoEmbed embedCode='<iframe src="javascript:alert(1)"></iframe>' />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('refuses to render a src whose effective host is not allowlisted', () => {
    render(<VideoEmbed embedCode='<iframe src="https://www.rsi.ch@evil.example.com/x"></iframe>' />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('shows an error box for an invalid embedCode', () => {
    render(<VideoEmbed embedCode="not an iframe" />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('renders nothing when neither url nor embedCode is provided', () => {
    const { container } = render(<VideoEmbed />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/blocks/VideoEmbed.spec.tsx`
Expected: FAIL — `embedCode` prop ignored; component renders nothing for embedCode-only input.

- [ ] **Step 3: Update the component**

Replace the contents of `src/components/blocks/VideoEmbed.tsx` with:

```tsx
'use client'

import { getAspectRatioPadding, getVideoEmbedData } from '@/utils/videoEmbed'
import { parseIframeEmbed } from '@/utils/audioEmbed'
import { ALLOWED_EMBED_HOSTS, isEmbedHostAllowed } from '@/utils/embeds'

interface VideoEmbedProps {
  url?: string
  embedCode?: string
  aspectRatio?: '16:9' | '4:3' | '21:9'
  locale?: 'de' | 'en'
}

const VIDEO_EMBED_DEFAULT_HEIGHT = 315

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url, embedCode, aspectRatio = '16:9', locale }) => {
  // Block was just inserted and no field has been filled in yet - this is
  // expected (e.g. while editing in the live preview) and isn't an error.
  if (!url && !embedCode) {
    return null
  }

  if (embedCode) {
    const parsed = parseIframeEmbed(embedCode)

    if (!parsed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[VideoEmbed] Invalid embed code:', embedCode)
      }

      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Video embed error</p>
          <p className="text-sm text-red-800">Unable to generate embed from the provided code.</p>
        </div>
      )
    }

    let host: string
    try {
      host = new URL(parsed.src).hostname
    } catch {
      host = ''
    }

    // Defense-in-depth: only render allowlisted https sources (validation also happens at save)
    if (!/^https?:\/\//i.test(parsed.src) || !isEmbedHostAllowed(host, ALLOWED_EMBED_HOSTS)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[VideoEmbed] Unsafe embed src:', parsed.src)
      }
      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Video embed error</p>
          <p className="text-sm text-red-800">Unable to generate embed from the provided code.</p>
        </div>
      )
    }

    return (
      <div className="my-8">
        <div className="overflow-hidden rounded-lg bg-gray-900">
          <iframe
            src={parsed.src}
            title={parsed.title ?? 'Video player'}
            width="100%"
            height={parsed.height ?? VIDEO_EMBED_DEFAULT_HEIGHT}
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    )
  }

  const embedData = getVideoEmbedData(url ?? '', locale)

  if (!embedData) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[VideoEmbed] Invalid URL:', url)
    }

    return (
      <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
        <p className="mb-2 font-semibold text-red-900">Video embed error</p>
        <p className="text-sm text-red-800">Unable to generate embed for: {url}</p>
      </div>
    )
  }

  const paddingBottom = getAspectRatioPadding(aspectRatio)

  return (
    <div className="my-8">
      <div
        className="relative w-full overflow-hidden rounded-lg bg-gray-900"
        style={{ paddingBottom: `${paddingBottom}%` }}
      >
        <iframe
          src={embedData.embedUrl}
          title={`${embedData.platform} video player`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute left-0 top-0 h-full w-full border-0"
        />
      </div>
    </div>
  )
}

export default VideoEmbed
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/blocks/VideoEmbed.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/VideoEmbed.tsx src/components/blocks/VideoEmbed.spec.tsx
git commit -m "feat(video-embed): render embedCode iframes with hardened attrs"
```

---

### Task 6: Pass `embedCode` through PayloadRichText

**Files:**
- Modify: `src/components/ui/PayloadRichText.tsx:169-172`

- [ ] **Step 1: Update the `videoEmbed` block converter**

In `src/components/ui/PayloadRichText.tsx`, change the `videoEmbed` converter (lines 169-172) from:

```tsx
          videoEmbed: ({ node }: { node: SerializedLexicalNode & { fields: VideoEmbedBlockFields } }) => {
            const { url, aspectRatio } = node.fields
            return <VideoEmbed url={url} aspectRatio={aspectRatio} locale={locale as 'de' | 'en'} />
          },
```

to:

```tsx
          videoEmbed: ({ node }: { node: SerializedLexicalNode & { fields: VideoEmbedBlockFields } }) => {
            const { url, embedCode, aspectRatio } = node.fields
            return <VideoEmbed url={url} embedCode={embedCode} aspectRatio={aspectRatio} locale={locale as 'de' | 'en'} />
          },
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PayloadRichText.tsx
git commit -m "feat(richtext): pass embedCode through to VideoEmbed block"
```

---

### Task 7: Full verification + typegen

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: PASS (all suites, including existing `videoEmbed.spec.ts`, `audioFields.spec.ts`, `embeds.spec.ts`, `AudioEmbed.spec.tsx`, and the new `VideoEmbed.spec.tsx` / `videoFields.spec.ts` / updated `fields.spec.ts`).

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS (oxlint).

- [ ] **Step 3: Run format check**

Run: `pnpm exec oxfmt --check src/validators/videoFields.ts src/validators/videoFields.spec.ts src/components/blocks/VideoEmbed.tsx src/components/blocks/VideoEmbed.spec.tsx src/blocks/VideoEmbed.ts src/utils/embeds.ts src/validators/fields.ts src/components/ui/PayloadRichText.tsx`
Expected: PASS. If diffs, run `pnpm format` then re-check.

- [ ] **Step 4: Regenerate types (hygiene, non-DB)**

Run: `pnpm payload generate:types`
Expected: regenerates `src/payload-types.ts` (no DB connection). Review diff — `VideoEmbedBlockFields` may appear generically; confirm no unexpected changes. If it produces a diff, include it.

- [ ] **Step 5: Run build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit any remaining changes**

```bash
git add -A src/payload-types.ts
git commit -m "chore(types): regenerate payload types after VideoEmbed embedCode field"
```

---

### Task 8: Artists `videoLinks` embedCode support (reuse VideoEmbed)

**Context:** The Artists collection's `videoLinks` array (rendered by `VideoAccordion`) only supports YouTube/arte.tv URLs via `buildEmbedSrc`. Add an optional `embedCode` to each array item so editors can paste broadcaster iframes there too. REUSE the already-built `<VideoEmbed>` component for rendering — DRY, single source of hardened rendering truth.

**Files:**
- Modify: `src/collections/Artists.ts` — add `embedCode` field to `videoLinks` array item
- Modify: `src/components/Artist/VideoAccordion.tsx` — `VideoLink` interface + render via `<VideoEmbed>`
- Modify: `src/components/Artist/VideoAccordion.spec.tsx` — tests
- Modify: `src/components/Artist/ArtistTabs.spec.tsx` / `ArtistTabContent.spec.tsx` if mock data types break

- [ ] **Step 1: Add `embedCode` field to the `videoLinks` array item**

In `src/collections/Artists.ts`, the `videoLinks` array item currently has `label` + `url` fields. Add an `embedCode` textarea field after `url`, with mutual exclusion:

```ts
                {
                  name: 'embedCode',
                  label: { en: 'Embed Code', de: 'Einbettungscode' },
                  type: 'textarea',
                  required: false,
                  admin: {
                    placeholder:
                      '<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761" width="392" height="220" allowfullscreen></iframe>',
                    description: {
                      en: 'Paste an <iframe> embed code from a supported provider (e.g. RSI, ARD Mediathek, RTS). Leave empty when using a URL.',
                      de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RSI, ARD Mediathek, RTS). Bei Verwendung einer URL leer lassen.',
                    },
                    condition: (_, siblingData) => !siblingData?.url,
                    rows: 4,
                  },
                  validate: validateVideoEmbedCode,
                },
```

And update the `url` field: `required: true` → `required: false`, add `admin.condition: (_, siblingData) => !siblingData?.embedCode`, update description to mention embed code.

Import `validateVideoEmbedCode` from `@/validators/videoFields` (add to the existing `import { validateURL, validateVideoURL } from '@/validators/fields'`).

- [ ] **Step 2: Write failing test for VideoAccordion embedCode rendering**

In `src/components/Artist/VideoAccordion.spec.tsx`, add a test that an item with `embedCode` renders (mock `<VideoEmbed>` to avoid iframe/network). Read the existing spec first — it likely mocks child components. If it renders real iframes, mock `@/components/blocks/VideoEmbed` instead:

```tsx
vi.mock('@/components/blocks/VideoEmbed', () => ({
  default: ({ url, embedCode }: { url?: string; embedCode?: string }) => (
    <div data-testid="video-embed" data-url={url} data-embed-code={embedCode ?? ''} />
  ),
}))
```

Test: an item with `embedCode` (and no url) renders the VideoEmbed mock with the embedCode passed through.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/Artist/VideoAccordion.spec.tsx`
Expected: FAIL — `VideoLink` has no `embedCode`, component ignores it.

- [ ] **Step 4: Update VideoAccordion to reuse VideoEmbed**

In `src/components/Artist/VideoAccordion.tsx`:
- `VideoLink` interface: add `embedCode?: string | null`.
- Import `VideoEmbed` from `@/components/blocks/VideoEmbed`.
- Replace the `buildEmbedSrc(video.url)`-based iframe rendering with a `<VideoEmbed url={video.url} embedCode={video.embedCode ?? undefined} />` for each mounted item. Keep the lazy-mount logic (`mountedIndices`) and the accordion shell.
- If a video has neither a valid URL nor embedCode, `VideoEmbed` renders nothing (its null-guard) — the accordion row can still show the label. Decide: keep showing rows for videos VideoEmbed can't render (label-only, empty panel) or filter them. RECOMMENDED: keep the existing behavior of filtering unsupported rows — but since `buildEmbedSrc` is replaced, use a simpler check: a video is renderable if `video.embedCode` is truthy OR `buildEmbedSrc(video.url)` is non-null. Keep `buildEmbedSrc` for the URL validity check and `firstValidIndex`.
- Panel content: replace the manual `<iframe>` block with `<VideoEmbed ... />` inside the same aspect-video wrapper div.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/Artist/VideoAccordion.spec.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck + format**

Run: `pnpm exec tsc --noEmit` — expect PASS.
Run: `pnpm exec oxfmt --check src/collections/Artists.ts src/components/Artist/VideoAccordion.tsx src/components/Artist/VideoAccordion.spec.tsx` — fix if needed.

- [ ] **Step 7: Run full suite**

Run: `pnpm exec vitest run src/components/Artist`
Expected: PASS (VideoAccordion + ArtistTabs + ArtistTabContent specs).

- [ ] **Step 8: Commit**

```bash
git add src/collections/Artists.ts src/components/Artist/VideoAccordion.tsx src/components/Artist/VideoAccordion.spec.tsx
git commit -m "feat(artists): support embed codes in videoLinks via VideoEmbed"
```

---

## Self-Review Notes

- **Spec coverage:** Spec §1 (block config) → Task 4; §2 (validator + validateVideoURL) → Tasks 2-3; §3 (allowlist) → Task 1; §4 (render) → Task 5; §5 (rich-text) → Task 6; §6 (typegen) → Task 7. Tests section → Tasks 1,2,3,5. Docs (mark old spec rejected) already done in spec commit.
- **Placeholder scan:** No TBD/TODO. Every code step has full content.
- **Type consistency:** `isEmbedHostAllowed` called with two args `(host, ALLOWED_EMBED_HOSTS)` in Tasks 2 and 5. Task 1 does NOT change the signature — it keeps single-arg (the second arg is accepted because `embeds.ts` `isEmbedHostAllowed(hostname, allowedHosts = ALLOWED_EMBED_HOSTS)`). Verify: the existing `isEmbedHostAllowed` signature is `(hostname: string)` with NO default param. **So Tasks 2 and 5 MUST pass `ALLOWED_EMBED_HOSTS` — but that requires Task 1 (or an earlier task) to also update the `embeds.ts` signature to accept an optional allowlist argument.** See correction below.

## Correction (apply before/during Task 1)

The existing `isEmbedHostAllowed(hostname)` does not accept an allowlist argument. To pass `ALLOWED_EMBED_HOSTS` explicitly from validators/render (and to keep the function pure/testable per review), update `src/utils/embeds.ts` in Task 1 to:

```ts
export const ALLOWED_EMBED_HOSTS = ['rts.ch', 'rsi.ch', 'ardmediathek.de'] as const

/**
 * Whether hostname may be embedded via iframe. Deny-by-default: exact
 * match or explicit dot-delimited subdomain of an allowlisted host.
 * Pass a parsed URL hostname (e.g. new URL(src).hostname), case-insensitive.
 * Optionally pass an explicit allowlist (defaults to ALLOWED_EMBED_HOSTS).
 */
export function isEmbedHostAllowed(hostname: string, allowedHosts: readonly string[] = ALLOWED_EMBED_HOSTS): boolean {
  const host = hostname.toLowerCase()
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}
```

This keeps existing single-arg call sites (`audioFields.ts:124`, `AudioEmbed.tsx:42`) working via the default, while letting the new video code pass the list explicitly. The Task 1 test still passes (`rsi.ch`/`ardmediathek.de` now in default allowlist). Fold this signature change into Task 1 Step 3.
