# EventDates Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `eventDates` lexical block to Posts so editors can list concert dates (date, location, optional url) that render exactly like post 242's hand-typed linked lines.

**Architecture:** Follows the existing VideoEmbed/AudioEmbed block pattern. Block config in `src/blocks/`, registered in `Posts.ts` `BlocksFeature`, rendered by a `src/components/blocks/` component wired into the `PayloadRichText` `blocks` converter. No DB migration — block data lives in the existing localized `content` lexical JSON.

**Tech Stack:** Payload CMS 3, Lexical rich text (`@payloadcms/richtext-lexical`), Next.js App Router, React, Vitest + Testing Library (happy-dom), Tailwind (unused here — plain markup), oxlint.

**Spec:** `docs/superpowers/specs/2026-08-28-eventdates-block-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/blocks/EventDates.ts` | Create | Block config + `EventDatesBlockFields` type + array validator |
| `src/blocks/EventDates.spec.ts` | Create | Validator unit tests |
| `src/components/blocks/EventDates.tsx` | Create | Render component + `formatEventDate` helper |
| `src/components/blocks/EventDates.spec.tsx` | Create | Component + helper tests |
| `src/components/ui/PayloadRichText.tsx` | Modify | Add `eventDates` entry to `blocks` converter map |
| `src/collections/Posts.ts` | Modify | Register block in `BlocksFeature` |

---

### Task 1: EventDates block config

**Files:**
- Create: `src/blocks/EventDates.ts`
- Test: `src/blocks/EventDates.spec.ts`

- [ ] **Step 1: Write the failing validator test**

Create `src/blocks/EventDates.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateEventDates } from './EventDates'

describe('validateEventDates', () => {
  it('accepts a non-empty array', () => {
    expect(validateEventDates([{ date: '2026-07-04', location: 'Yamagata' }])).toBe(true)
  })

  it('rejects a non-array value', () => {
    expect(validateEventDates('nope')).toBe('At least one event is required')
  })

  it('rejects an empty array', () => {
    expect(validateEventDates([])).toBe('At least one event is required')
  })

  it('rejects undefined', () => {
    expect(validateEventDates(undefined)).toBe('At least one event is required')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/blocks/EventDates.spec.ts`
Expected: FAIL — `validateEventDates` is not exported / module not found.

- [ ] **Step 3: Write the block config**

Create `src/blocks/EventDates.ts`:

```ts
import type { Block } from 'payload'

import { validateURL } from '@/validators/fields'

/**
 * Event Dates Block Field Types
 *
 * Block fields live inside richText JSON and are not part of generated
 * payload-types — this interface is the sole typing source for the converter.
 */
export interface EventDatesBlockFields {
  events: { id?: string; date: string; location: string; url?: string }[]
}

/**
 * Server-side guard for the events array. Payload's `minRows` is UI-only and
 * is not enforced by the API, so an explicit validate rejects empty arrays.
 */
export const validateEventDates = (value: unknown): true | string => {
  if (!Array.isArray(value) || value.length === 0) {
    return 'At least one event is required'
  }
  return true
}

/**
 * Event Dates Block
 *
 * Lists concert dates (date, location, optional url) inside post content.
 * Renders like post 242's manual "4. Juli 2026, Yamagata" linked lines.
 */
export const EventDates: Block = {
  slug: 'eventDates',
  labels: {
    singular: { en: 'Event Dates', de: 'Termin' },
    plural: { en: 'Event Dates', de: 'Termine' },
  },
  admin: {
    // Same upstream focus-stealing bug as the other blocks; blockName unused.
    disableBlockName: true,
  },
  fields: [
    {
      name: 'events',
      type: 'array',
      required: true,
      minRows: 1,
      validate: validateEventDates,
      labels: {
        singular: { en: 'Event', de: 'Veranstaltung' },
        plural: { en: 'Events', de: 'Veranstaltungen' },
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          label: { en: 'Date', de: 'Datum' },
          admin: {
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'location',
          type: 'text',
          required: true,
          label: { en: 'Location', de: 'Ort' },
        },
        {
          name: 'url',
          type: 'text',
          required: false,
          label: { en: 'URL', de: 'URL' },
          validate: validateURL(),
        },
      ],
    },
  ],
}
```

Note: `validateURL` is a curried factory — it must be invoked (`validateURL()`), matching `validateURL` usage in `src/validators/fields.ts:72`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/blocks/EventDates.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/blocks/EventDates.ts src/blocks/EventDates.spec.ts
git commit -m "feat(blocks): add EventDates block config and array validator"
```

---

### Task 2: EventDates render component

**Files:**
- Create: `src/components/blocks/EventDates.tsx`
- Test: `src/components/blocks/EventDates.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/blocks/EventDates.spec.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EventDates, { formatEventDate } from './EventDates'

const withUrl = {
  id: 'row-1',
  date: '2026-07-04T00:00:00.000Z',
  location: 'Yamagata',
  url: 'https://yamagataterrsa.or.jp/concerts/20260704/',
}

const withoutUrl = { id: 'row-2', date: '2026-07-05T00:00:00.000Z', location: 'Fukushima' }

describe('formatEventDate', () => {
  it('formats a German date', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'de')).toBe('4. Juli 2026')
  })

  it('formats an English date', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'en')).toBe('July 4, 2026')
  })

  it('returns empty string for null, undefined, or empty input', () => {
    expect(formatEventDate(null, 'de')).toBe('')
    expect(formatEventDate(undefined, 'de')).toBe('')
    expect(formatEventDate('', 'de')).toBe('')
  })

  it('returns empty string for an invalid date', () => {
    expect(formatEventDate('not-a-date', 'de')).toBe('')
  })

  it('does not shift the day for midnight-UTC values', () => {
    expect(formatEventDate('2026-07-04T00:00:00.000Z', 'en')).toBe('July 4, 2026')
  })
})

describe('EventDates', () => {
  it('renders nothing when events is empty', () => {
    const { container } = render(<EventDates events={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when events is undefined', () => {
    const { container } = render(<EventDates events={undefined as never} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a linked line in German by default', () => {
    render(<EventDates events={[withUrl]} />)
    const link = screen.getByRole('link', { name: '4. Juli 2026, Yamagata' })
    expect(link.getAttribute('href')).toBe('https://yamagataterrsa.or.jp/concerts/20260704/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders a linked line in English when locale is en', () => {
    render(<EventDates events={[withUrl]} locale="en" />)
    expect(screen.getByRole('link', { name: 'July 4, 2026, Yamagata' })).toBeInTheDocument()
  })

  it('renders plain text when url is absent', () => {
    render(<EventDates events={[withoutUrl]} />)
    expect(screen.getByText('5. Juli 2026, Fukushima')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders plain text for an unsafe url', () => {
    render(<EventDates events={[{ ...withoutUrl, url: 'javascript:alert(1)' }]} />)
    expect(screen.getByText('5. Juli 2026, Fukushima')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('renders a link for a whitespace-padded url', () => {
    render(<EventDates events={[{ ...withoutUrl, url: ' https://example.com ' }]} />)
    expect(screen.getByRole('link', { name: '5. Juli 2026, Fukushima' }).getAttribute('href')).toBe(
      'https://example.com'
    )
  })

  it('renders multiple events in order separated by line breaks', () => {
    const { container } = render(<EventDates events={[withUrl, withoutUrl]} />)
    expect(screen.getByRole('link', { name: '4. Juli 2026, Yamagata' })).toBeInTheDocument()
    expect(screen.getByText('5. Juli 2026, Fukushima')).toBeInTheDocument()
    expect(container.querySelector('br')).not.toBeNull()
    expect(container.textContent).toBe('4. Juli 2026, Yamagata5. Juli 2026, Fukushima')
  })

  it('does not render 1970 or a leading comma when date is null', () => {
    render(<EventDates events={[{ id: 'row-3', date: null as never, location: 'Tokio' }]} />)
    expect(screen.getByText('Tokio')).toBeInTheDocument()
    expect(screen.queryByText(/1970/)).toBeNull()
  })

  it('does not render a trailing comma when location is empty', () => {
    const { container } = render(<EventDates events={[{ id: 'row-4', date: '2026-07-04T00:00:00.000Z', location: '' }]} />)
    expect(container.textContent).toBe('4. Juli 2026')
  })

  it('renders a row without an id', () => {
    const { date, location, url } = withUrl
    const { container } = render(<EventDates events={[{ date, location, url }]} />)
    expect(screen.getByRole('link', { name: '4. Juli 2026, Yamagata' })).toBeInTheDocument()
    expect(container.querySelector('a')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/components/blocks/EventDates.spec.tsx`
Expected: FAIL — `./EventDates` module not found.

- [ ] **Step 3: Write the minimal component**

Create `src/components/blocks/EventDates.tsx`:

```tsx
'use client'

import { sanitizeUrl } from '@/utils/html'

interface EventDatesProps {
  events: { id?: string; date: string; location: string; url?: string | null }[]
  locale?: 'de' | 'en'
}

/**
 * Formats a Payload day-only date value for the given locale. Uses explicit UTC
 * because Payload's day-only picker stores the picked day as noon UTC (API
 * writes may vary). Without `timeZone` viewers in UTC+13/+14 see the next day,
 * and an SSR(UTC)/client timezone mismatch hydrates the wrong day.
 */
export function formatEventDate(iso: string | null | undefined, locale: 'de' | 'en'): string {
  if (!iso || typeof iso !== 'string') return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const EventDates: React.FC<EventDatesProps> = ({ events, locale = 'de' }) => {
  if (!events || events.length === 0) return null

  return (
    <p>
      {events.map((event, index) => {
        const text = [formatEventDate(event.date, locale), event.location].filter(Boolean).join(', ')
        const safeUrl = event.url ? sanitizeUrl(event.url) : ''
        const line = safeUrl && safeUrl !== '#' ? (
          <a href={safeUrl} rel="noopener noreferrer" target="_blank">
            {text}
          </a>
        ) : (
          text
        )
        return (
          <span key={event.id ?? index}>
            {index > 0 && <br />}
            {line}
          </span>
        )
      })}
    </p>
  )
}

export default EventDates
```

Notes:
- `formatEventDate` guards `null`/`undefined`/`''`/non-string **before** `new Date` — `new Date(null)` would yield 1970-01-01.
- Comma-safe join: `[dateText, location].filter(Boolean).join(', ')` avoids leading/trailing commas.
- Row key: `event.id ?? index` (freshly inserted live-preview rows have no id).
- `sanitizeUrl` (from `src/utils/html.ts:38`) trims input and returns `'#'` for `javascript:`/`data:`/`vbscript:` and non-http(s) schemes — those rows render as plain text.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/components/blocks/EventDates.spec.tsx`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/blocks/EventDates.tsx src/components/blocks/EventDates.spec.tsx
git commit -m "feat(blocks): add EventDates render component with locale-aware date formatting"
```

---

### Task 3: Wire the converter in PayloadRichText

**Files:**
- Modify: `src/components/ui/PayloadRichText.tsx` (imports at lines 11-14; `blocks` map at lines 168-179)

- [ ] **Step 1: Add imports**

At the top of `src/components/ui/PayloadRichText.tsx`, next to the existing block imports (lines 11-14), add:

```ts
import EventDates from '@/components/blocks/EventDates'
import type { EventDatesBlockFields } from '@/blocks/EventDates'
```

- [ ] **Step 2: Add the block converter**

In the `blocks` converter map (`PayloadRichText.tsx:168-179`), after the `audioEmbed` entry, add:

```tsx
eventDates: ({ node }: { node: SerializedLexicalNode & { fields: EventDatesBlockFields } }) => {
  return <EventDates events={node.fields.events} locale={locale as 'de' | 'en'} />
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If tsc is slow, `pnpm lint` in Task 5 also catches import errors.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/PayloadRichText.tsx
git commit -m "feat(blocks): render EventDates block in rich text converter"
```

---

### Task 4: Register the block in Posts

**Files:**
- Modify: `src/collections/Posts.ts` (import at lines 9-10; `BlocksFeature` at lines 131-133)

- [ ] **Step 1: Add the import**

Next to the existing block imports (`Posts.ts:9-10`), add:

```ts
import { EventDates } from '@/blocks/EventDates'
```

- [ ] **Step 2: Register in BlocksFeature**

Change `Posts.ts:132` from:

```ts
blocks: [VideoEmbed, AudioEmbed],
```

to:

```ts
blocks: [VideoEmbed, AudioEmbed, EventDates],
```

Posts only — do NOT touch `src/collections/Repertoire.ts` (explicit scope decision).

- [ ] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/collections/Posts.ts
git commit -m "feat(posts): register EventDates block in rich text editor"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including the new `EventDates` and `EventDatesBlock` specs.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Run the production build**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Manual admin verification (local dev.db)**

1. Start the dev server: `pnpm dev`.
2. Open a post in the admin, insert the "Event Dates" block, add ≥2 events (date via day-only picker, location, url on one).
3. Save and view the post in both `de` and `en`.
4. Verify: renders like post 242 — `"4. Juli 2026, Yamagata"` linked, one per line; `en` shows `"July 4, 2026, Yamagata"`.
5. **Reviewer assumption verified:** the day-only picker stores noon UTC (confirmed from node_modules source); API-written values vary. Date renders correctly via the explicit `timeZone: 'UTC'` formatter.

Note: the block must be added to each locale separately (content is localized with fallback off) — same as today's manual 242 practice.

- [ ] **Step 5: Clean up**

Stop the dev server. Delete any scratch scripts in `tmp/` if created.