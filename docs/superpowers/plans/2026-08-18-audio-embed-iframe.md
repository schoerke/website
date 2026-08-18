# Audio Embed Generic Iframe Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors paste a raw `<iframe>` embed snippet (RTS first) into the Audio Embed block and render it safely, alongside the existing Spotify / Apple Music URL path.

**Architecture:** Add an optional `embedCode` field to the AudioEmbed block. `validateEmbedCode` (in `src/validators/audioFields.ts`) rejects snippets whose `src` host is not on the code-level allowlist (`src/utils/embeds.ts`). `parseIframeEmbed` (in `src/utils/audioEmbed.ts`) regex-extracts only `src`/`width`/`height`/`title`. The client component rebuilds the iframe element from those fixed props — never `dangerouslySetInnerHTML` — so junk attributes are discarded by construction. `url`/`embedCode` both-required-check uses Payload's `siblingData` in the field validators. No schema change: blocks live in rich-text JSON inside the existing `content` column (verified — no `_blocks_audioEmbed` tables in `payload-generated-schema.ts`).

**Tech Stack:** Payload CMS 3.88 (Lexical rich text `BlocksFeature`), Next.js 15 App Router, React, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-audio-embed-iframe-design.md`

---

### Task 1: Embed host allowlist

**Files:**
- Create: `src/utils/embeds.ts`
- Test: `src/utils/embeds.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { isEmbedHostAllowed } from './embeds'

describe('isEmbedHostAllowed', () => {
  it('allows an exact allowlisted host', () => {
    expect(isEmbedHostAllowed('rts.ch')).toBe(true)
  })

  it('allows an explicit subdomain of an allowlisted host', () => {
    expect(isEmbedHostAllowed('www.rts.ch')).toBe(true)
  })

  it('rejects a host not on the allowlist', () => {
    expect(isEmbedHostAllowed('evil.example.com')).toBe(false)
  })

  it('rejects a lookalike host (suffix match, not a subdomain)', () => {
    expect(isEmbedHostAllowed('not-rts-ch.com')).toBe(false)
    expect(isEmbedHostAllowed('rtsch.com')).toBe(false)
  })

  it('rejects empty strings', () => {
    expect(isEmbedHostAllowed('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/embeds.spec.ts`
Expected: FAIL — module `./embeds` not found / `isEmbedHostAllowed` not exported.

- [ ] **Step 3: Write the implementation**

```ts
export const ALLOWED_EMBED_HOSTS = ['rts.ch'] as const

export function isEmbedHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_EMBED_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/embeds.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/embeds.ts src/utils/embeds.spec.ts
git commit -m "feat(embeds): add iframe embed host allowlist"
```

---

### Task 2: `parseIframeEmbed` utility

**Files:**
- Modify: `src/utils/audioEmbed.ts`
- Test: `src/utils/audioEmbed.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/audioEmbed.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseIframeEmbed } from './audioEmbed'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" frameborder="0" allowfullscreen="true" allow="fullscreen; geolocation *; autoplay; encrypted-media" name="Concert en direct"></iframe>`

describe('parseIframeEmbed', () => {
  it('parses src, width, height and title from a valid snippet', () => {
    const snippet = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" title="Concert"></iframe>`
    expect(parseIframeEmbed(snippet)).toEqual({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462',
      width: 392,
      height: 58,
      title: 'Concert',
    })
  })

  it('handles missing optional attributes', () => {
    expect(parseIframeEmbed(RTS_SNIPPET)).toMatchObject({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462',
      width: 392,
      height: 58,
    })
  })

  it('returns null when src is missing', () => {
    expect(parseIframeEmbed('<iframe width="392" height="58"></iframe>')).toBeNull()
  })

  it('returns null for non-snippet garbage', () => {
    expect(parseIframeEmbed('not an iframe at all')).toBeNull()
    expect(parseIframeEmbed('')).toBeNull()
  })

  it('ignores event handlers and srcdoc', () => {
    const snippet = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:1" onload="alert(1)" srcdoc="<script>alert(2)</script>" style="position:fixed"></iframe>`
    const parsed = parseIframeEmbed(snippet)
    expect(parsed).toEqual({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:1',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/audioEmbed.spec.ts`
Expected: FAIL — `parseIframeEmbed` not exported.

- [ ] **Step 3: Add the parser to `src/utils/audioEmbed.ts`**

Append below `getAudioEmbedHeight`:

```ts
export interface ParsedIframe {
  src: string
  width?: number
  height?: number
  title?: string
}

const IFRAME_ATTR = (name: string) => new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i')

export function parseIframeEmbed(code: string): ParsedIframe | null {
  if (!code || !code.toLowerCase().includes('<iframe')) return null

  const srcMatch = code.match(IFRAME_ATTR('src'))
  if (!srcMatch || !srcMatch[1]) return null

  const num = (match: RegExpMatchArray | null): number | undefined => {
    const n = Number(match?.[1])
    return Number.isFinite(n) ? n : undefined
  }

  const parsed: ParsedIframe = { src: srcMatch[1] }

  const width = num(code.match(IFRAME_ATTR('width')))
  const height = num(code.match(IFRAME_ATTR('height')))
  const title = code.match(IFRAME_ATTR('title'))?.[1]

  if (width) parsed.width = width
  if (height) parsed.height = height
  if (title) parsed.title = title

  return parsed
}
```

Note: only the four attributes above are ever read; event handlers, `srcdoc`, `style`, etc. are never captured.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/audioEmbed.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/audioEmbed.ts src/utils/audioEmbed.spec.ts
git commit -m "feat(embeds): add iframe snippet parser"
```

---

### Task 3: `validateEmbedCode` validator

**Files:**
- Modify: `src/validators/audioFields.ts`
- Test: `src/validators/audioFields.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/validators/audioFields.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateEmbedCode } from './audioFields'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>`

describe('validateEmbedCode', () => {
  it('accepts an iframe snippet from an allowlisted host', () => {
    expect(validateEmbedCode(RTS_SNIPPET)).toBe(true)
  })

  it('accepts a snippet from a subdomain of an allowlisted host', () => {
    expect(
      validateEmbedCode('<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>')
    ).toBe(true)
  })

  it('rejects an iframe from a non-allowlisted host', () => {
    expect(
      validateEmbedCode('<iframe src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
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
    // data-src must not be mistaken for src
    expect(
      validateEmbedCode('<iframe data-src="https://www.rts.ch/x" src="https://evil.example.com/x"></iframe>')
    ).toBe('Embed iframe host is not allowed')
    expect(
      validateEmbedCode('<iframe data-src="https://evil.example.com/x" src="https://www.rts.ch/x"></iframe>')
    ).toBe(true)
  })

  it('rejects non-https src', () => {
    expect(
      validateEmbedCode('<iframe src="http://rts.ch/play/embed?urn=x"></iframe>')
    ).toBe('Please enter a valid embed code')
  })

  it('rejects non-string values', () => {
    expect(validateEmbedCode(123)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(null)).toBe('Please enter a valid embed code')
    expect(validateEmbedCode(undefined)).toBe('Please enter a valid embed code')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/validators/audioFields.spec.ts`
Expected: FAIL — `validateEmbedCode` not exported.

- [ ] **Step 3: Add the validator to `src/validators/audioFields.ts`**

First add the import at the very top of the file (project rule: imports at top):

```ts
import { isEmbedHostAllowed } from '@/utils/embeds'
```

Then append (regex hardened to match Task 2's `parseIframeEmbed` — scoped to the iframe tag, attribute-name boundary):

```ts
const EMBED_IFRAME_TAG = /<iframe\b[^>]*>/i
const EMBED_ATTR = (name: string) => new RegExp(`(?<![\\w-])${name}\\s*=\\s*["']([^"']*)["']`, 'i')

/**
 * Validates raw <iframe> embed codes (e.g. RTS) against the host allowlist.
 *
 * @param value - Raw iframe snippet string
 * @returns true if valid, error message if invalid
 */
export const validateEmbedCode = (value: unknown): true | string => {
  if (typeof value !== 'string' || !/<iframe\b/i.test(value)) {
    return 'Please enter a valid embed code'
  }

  const tag = value.match(EMBED_IFRAME_TAG)?.[0] ?? ''
  const srcMatch = tag.match(EMBED_ATTR('src'))
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/validators/audioFields.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/validators/audioFields.ts src/validators/audioFields.spec.ts
git commit -m "feat(embeds): validate iframe embed codes against host allowlist"
```

---

### Task 4: Block config — `embedCode` field + both-required check

**Files:**
- Modify: `src/blocks/AudioEmbed.ts`
- Test: `src/validators/audioFields.spec.ts` (extend)

- [ ] **Step 1: Write the failing test for the both-empty guard**

Extend `src/validators/audioFields.spec.ts`:

```ts
import { validateAudioURL } from './audioFields'

describe('validateAudioURL', () => {
  it('accepts a Spotify track URL', () => {
    expect(validateAudioURL('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toBe(true)
  })

  it('accepts an Apple Music album URL', () => {
    expect(
      validateAudioURL('https://music.apple.com/us/album/example/1234567890')
    ).toBe(true)
  })

  it('accepts an empty url when sibling embedCode is present', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })).toBe(true)
  })

  it('rejects an empty url when sibling embedCode is also empty', () => {
    expect(validateAudioURL('', { siblingData: { embedCode: '' } })).toBe(
      'Please enter either an audio URL or an embed code'
    )
  })

  it('rejects an invalid url even when embedCode is present', () => {
    expect(
      validateAudioURL('not-a-url', { siblingData: { embedCode: '<iframe src="https://www.rts.ch/x"></iframe>' } })
    ).toBe('Please enter a valid URL format')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/validators/audioFields.spec.ts`
Expected: FAIL — `validateAudioURL` signature is `(value: unknown)` only; the `siblingData` second arg is unused and the empty-url cases return `'Please enter a valid URL format'`.

- [ ] **Step 3: Update `validateAudioURL` in `src/validators/audioFields.ts`**

Replace the signature + empty handling:

```ts
interface AudioURLContext {
  siblingData?: { url?: unknown; embedCode?: unknown }
}

export const validateAudioURL = (value: unknown, { siblingData }: AudioURLContext = {}): true | string => {
  const embedCode = siblingData?.embedCode

  // Empty url is fine when an embed code is set on the sibling field
  if (value === '' && (typeof embedCode === 'string' && embedCode.trim() !== '')) {
    return true
  }

  if (value === '' || value === undefined || value === null) {
    return 'Please enter either an audio URL or an embed code'
  }

  if (typeof value !== 'string') return 'Please enter a valid audio URL'

  try {
    const url = new URL(value)

    // Spotify
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

    // Apple Music
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
```

- [ ] **Step 4: Also add the embedCode sibling guard in `validateEmbedCode`**

In `validateEmbedCode`, before the string check, allow empty when `url` sibling is set. Replace the top of the function:

```ts
export const validateEmbedCode = (value: unknown, { siblingData }: AudioURLContext = {}): true | string => {
  const url = siblingData?.url

  if ((value === '' || value === undefined || value === null) && typeof url === 'string' && url.trim() !== '') {
    return true
  }

  if (typeof value !== 'string' || !value.toLowerCase().includes('<iframe')) {
    return 'Please enter a valid embed code'
  }
  // ...rest unchanged
```

- [ ] **Step 5: Update block config — `src/blocks/AudioEmbed.ts`**

Replace the whole file:

```ts
import type { Block } from 'payload'

import { validateAudioURL, validateEmbedCode } from '@/validators/audioFields'

/**
 * Audio Embed Block Field Types
 */
export interface AudioEmbedBlockFields {
  url?: string
  embedCode?: string
}

/**
 * Audio Embed Block
 *
 * Embeds audio within rich text content.
 * - url: Spotify / Apple Music native embeds
 * - embedCode: raw <iframe> snippet from allowlisted providers (e.g. RTS)
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
          en: 'Spotify or Apple Music URL (leave empty when using an embed code)',
          de: 'Spotify- oder Apple-Music-URL (bei Einbettungscode leer lassen)',
        },
        condition: (_, siblingData) => !siblingData?.embedCode,
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
          en: 'Paste an <iframe> embed code from a supported provider (e.g. RTS)',
          de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RTS)',
        },
        condition: (_, siblingData) => !siblingData?.url,
        rows: 4,
      },
      validate: validateEmbedCode,
    },
  ],
}
```

- [ ] **Step 6: Run all validator + block-adjacent tests**

Run: `pnpm vitest run src/validators/audioFields.spec.ts src/utils/audioEmbed.spec.ts src/utils/embeds.spec.ts`
Expected: PASS (all).

- [ ] **Step 7: Commit**

```bash
git add src/validators/audioFields.ts src/validators/audioFields.spec.ts src/blocks/AudioEmbed.ts
git commit -m "feat(audio-embed): add embedCode field with both-required validation"
```

---

### Task 5: Renderer — `AudioEmbed.tsx`

**Files:**
- Modify: `src/components/blocks/AudioEmbed.tsx`

- [ ] **Step 1: Update the component to render embedCode**

Replace `src/components/blocks/AudioEmbed.tsx` entirely:

```tsx
'use client'

import { getAudioEmbedData, getAudioEmbedHeight, parseIframeEmbed } from '@/utils/audioEmbed'

interface AudioEmbedProps {
  url?: string
  embedCode?: string
}

const AudioEmbed: React.FC<AudioEmbedProps> = ({ url, embedCode }) => {
  if (embedCode) {
    const parsed = parseIframeEmbed(embedCode)

    if (!parsed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AudioEmbed] Invalid embed code:', embedCode)
      }

      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Audio embed error</p>
          <p className="text-sm text-red-800">Unable to generate embed from the provided code.</p>
        </div>
      )
    }

    return (
      <div className="my-8">
        <div className="overflow-hidden rounded-lg bg-gray-100">
          <iframe
            src={parsed.src}
            title={parsed.title ?? 'Audio player'}
            width="100%"
            height={parsed.height ?? 58}
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            allow="autoplay; encrypted-media"
            loading="lazy"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>
    )
  }

  const embedData = getAudioEmbedData(url ?? '')

  if (!embedData) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AudioEmbed] Invalid URL:', url)
    }

    return (
      <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
        <p className="mb-2 font-semibold text-red-900">Audio embed error</p>
        <p className="text-sm text-red-800">Unable to generate embed for: {url}</p>
      </div>
    )
  }

  const height = getAudioEmbedHeight(embedData.contentType)

  return (
    <div className="my-8">
      <div className="overflow-hidden rounded-lg bg-gray-100">
        <iframe
          src={embedData.embedUrl}
          title={`${embedData.platform === 'spotify' ? 'Spotify' : 'Apple Music'} ${embedData.contentType} player`}
          width="100%"
          height={height}
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: '12px' }}
        />
      </div>
    </div>
  )
}

export default AudioEmbed
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS. (If unrelated pre-existing errors exist, they are pre-existing — note them, don't fix.)

- [ ] **Step 3: Commit**

```bash
git add src/components/blocks/AudioEmbed.tsx
git commit -m "feat(audio-embed): render iframe embed codes safely"
```

---

### Task 6: Wire `embedCode` through rich text renderer

**Files:**
- Modify: `src/components/ui/PayloadRichText.tsx:89-92`

- [ ] **Step 1: Pass `embedCode` to the AudioEmbed block renderer**

In `src/components/ui/PayloadRichText.tsx`, replace the `audioEmbed` block converter:

```tsx
audioEmbed: ({ node }: { node: SerializedLexicalNode & { fields: AudioEmbedBlockFields } }) => {
  const { url, embedCode } = node.fields
  return <AudioEmbed url={url} embedCode={embedCode} />
},
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PayloadRichText.tsx
git commit -m "feat(audio-embed): wire embedCode through rich text renderer"
```

---

### Task 7: Full verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Manual smoke test (dev)**

Run: `pnpm dev`. In the admin, open any Post (or Repertoire), add an Audio Embed block, paste the RTS snippet:

```html
<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" allowfullscreen></iframe>
```

Expected: saves without validation error; on the frontend the RTS player renders (~392×58, gray rounded container). Remove the snippet and save with an empty url too → blocked by validation.

- [ ] **Step 5: Confirm no DB impact**

Run: `rg -i "audioembed" src/payload-generated-schema.ts src/migrations/`
Expected: no output (no block tables — pure JSON field).

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "chore: verification fixes"
```
(Only if Step 1-3 surfaced fixes. Otherwise skip — do not create an empty commit.)

---

## Self-Review Notes

- **Spec coverage:** allowlist (T1), parser (T2), validator (T3), block field + both-required (T4), renderer safety (T5), rich-text wiring (T6), verification + no-DB-commit (T7). All spec sections covered.
- **Type consistency:** `AudioURLContext` used in both validators; `ParsedIframe` shared by parser and renderer; `AudioEmbedBlockFields.url`/`embedCode` both optional — `PayloadRichText` destructures both.
- **No placeholders:** every step has concrete code + commands.
