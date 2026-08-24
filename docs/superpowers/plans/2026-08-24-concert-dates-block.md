# Concert Dates Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable `concertDates` lexical block to news posts that renders structured date/venue/link rows, replacing hand-typed linked text lines (see Post 240).

**Architecture:** Follows the existing VideoEmbed/AudioEmbed block pattern: a Payload `Block` config in `src/blocks/`, registered in the Posts `BlocksFeature`, rendered by a component in `src/components/blocks/`, wired through the converter map in `src/components/ui/PayloadRichText.tsx`. Block data lives inline in the lexical JSON of the existing `content` field — no DB migration, no schema push.

**Tech Stack:** Payload CMS 3, lexical rich text (`@payloadcms/richtext-lexical`), React, Next.js App Router, Tailwind CSS, Vitest + Testing Library (happy-dom).

---

### Task 1: Block config + registration

**Files:**
- Create: `src/blocks/ConcertDates.ts`
- Modify: `src/collections/Posts.ts:120-130` (BlocksFeature array)

- [ ] **Step 1: Create the block config**

`src/blocks/ConcertDates.ts`:

```ts
import type { Block } from 'payload'

import { validateURL } from '@/validators/fields'

/**
 * Concert Dates Block Field Types
 */
export interface ConcertDatesBlockFields {
  dates: { id?: string; date: string; venue: string; url?: string }[]
}

/**
 * Concert Dates Block
 *
 * Structured list of concert dates within rich text content.
 * Each entry has a date, a localized venue, and an optional external event link.
 */
export const ConcertDates: Block = {
  slug: 'concertDates',
  labels: {
    singular: {
      en: 'Concert date',
      de: 'Konzerttermin',
    },
    plural: {
      en: 'Concert dates',
      de: 'Konzerttermine',
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
      name: 'dates',
      type: 'array',
      minRows: 1,
      label: {
        en: 'Dates',
        de: 'Termine',
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          label: {
            en: 'Date',
            de: 'Datum',
          },
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
          },
        },
        {
          name: 'venue',
          type: 'text',
          localized: true,
          required: true,
          label: {
            en: 'Venue',
            de: 'Veranstaltungsort',
          },
        },
        {
          name: 'url',
          type: 'text',
          label: {
            en: 'Event link',
            de: 'Link zur Veranstaltung',
          },
          admin: {
            placeholder: 'https://...',
            description: {
              en: 'Optional external link to the event or ticketing page',
              de: 'Optionaler externer Link zur Veranstaltungs- oder Ticketseite',
            },
          },
          validate: validateURL(),
        },
      ],
    },
  ],
}
```

Note: `validateURL` is a curried factory — it must be invoked (`validateURL()`, not `validateURL`).

- [ ] **Step 2: Register in Posts collection**

In `src/collections/Posts.ts`:

Add import after line 10 (`import { VideoEmbed } from '@/blocks/VideoEmbed'`):

```ts
import { ConcertDates } from '@/blocks/ConcertDates'
```

Change the BlocksFeature blocks array (line 124):

```ts
BlocksFeature({
  blocks: [VideoEmbed, AudioEmbed, ConcertDates],
}),
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors)

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/blocks/ConcertDates.ts src/collections/Posts.ts
git commit -m "feat(blocks): add concert dates block config"
```

---

### Task 2: Render component (TDD)

**Files:**
- Create: `src/components/blocks/ConcertDates.spec.tsx`
- Create: `src/components/blocks/ConcertDates.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/blocks/ConcertDates.spec.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ConcertDates from './ConcertDates'

const DATE = '2026-07-17T00:00:00.000Z'

describe('ConcertDates', () => {
  it('renders nothing when dates is empty', () => {
    const { container } = render(<ConcertDates dates={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when dates is undefined', () => {
    const { container } = render(<ConcertDates dates={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the date in German format', () => {
    render(<ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach' }]} locale="de" />)
    expect(screen.getByText('17. Juli 2026')).toBeInTheDocument()
  })

  it('renders the date in English format', () => {
    render(<ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach' }]} locale="en" />)
    expect(screen.getByText('July 17, 2026')).toBeInTheDocument()
  })

  it('renders the venue', () => {
    render(<ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach' }]} locale="de" />)
    expect(screen.getByText('Toblach')).toBeInTheDocument()
  })

  it('wraps the venue in an external link when url is present', () => {
    const url = 'https://www.kulturzentrum-toblach.eu/de/kulturprogramm'
    render(<ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach', url }]} locale="de" />)
    const link = screen.getByRole('link', { name: 'Toblach' })
    expect(link).toHaveAttribute('href', url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the venue without a link when url is absent', () => {
    render(<ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach' }]} locale="de" />)
    expect(screen.queryByRole('link', { name: 'Toblach' })).not.toBeInTheDocument()
  })

  it('omits the link for an unsafe (non-http) url', () => {
    render(
      <ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach', url: 'javascript:alert(1)' }]} locale="de" />
    )
    expect(screen.queryByRole('link', { name: 'Toblach' })).not.toBeInTheDocument()
    expect(screen.getByText('Toblach')).toBeInTheDocument()
  })

  it('renders multiple rows', () => {
    render(
      <ConcertDates
        dates={[
          { id: 'a', date: '2026-07-17T00:00:00.000Z', venue: 'Toblach' },
          { id: 'b', date: '2026-07-18T00:00:00.000Z', venue: 'Dobbiaco' },
        ]}
        locale="de"
      />
    )
    expect(screen.getByText('17. Juli 2026')).toBeInTheDocument()
    expect(screen.getByText('18. Juli 2026')).toBeInTheDocument()
    expect(screen.getByText('Toblach')).toBeInTheDocument()
    expect(screen.getByText('Dobbiaco')).toBeInTheDocument()
  })

  it('defaults locale to German', () => {
    render(<ConcertDates dates={[{ id: 'a', date: DATE, venue: 'Toblach' }]} />)
    expect(screen.getByText('17. Juli 2026')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/blocks/ConcertDates.spec.tsx`
Expected: FAIL — `Cannot find module './ConcertDates'`

- [ ] **Step 3: Implement the component**

`src/components/blocks/ConcertDates.tsx`:

```tsx
'use client'

import type { ConcertDatesBlockFields } from '@/blocks/ConcertDates'

interface ConcertDatesProps {
  dates?: ConcertDatesBlockFields['dates']
  locale?: 'de' | 'en'
}

function isSafeHttpUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const ConcertDates: React.FC<ConcertDatesProps> = ({ dates, locale = 'de' }) => {
  // Block was just inserted and has no rows yet - expected while editing.
  if (!dates || dates.length === 0) {
    return null
  }

  // timeZone UTC: Payload date fields store midnight UTC; without this, en
  // viewers in western timezones would see the previous day.
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <ul className="text-sm leading-relaxed">
      {dates.map(({ id, date, venue, url }) => {
        const safeUrl = isSafeHttpUrl(url)
        const venueEl = safeUrl ? (
          <a className="underline" href={safeUrl} target="_blank" rel="noopener noreferrer">
            {venue}
          </a>
        ) : (
          <span>{venue}</span>
        )

        return (
          <li key={id ?? `${date}-${venue}`}>
            <time dateTime={date}>{dateFormatter.format(new Date(date))}</time>
            {', '}
            {venueEl}
          </li>
        )
      })}
    </ul>
  )
}

export default ConcertDates
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/blocks/ConcertDates.spec.tsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Verify lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/blocks/ConcertDates.tsx src/components/blocks/ConcertDates.spec.tsx
git commit -m "feat(blocks): add concert dates render component"
```

---

### Task 3: Wire converter

**Files:**
- Modify: `src/components/ui/PayloadRichText.tsx`

- [ ] **Step 1: Add import and converter case**

In `src/components/ui/PayloadRichText.tsx`:

Add import after line 11 (`import type { AudioEmbedBlockFields } from '@/blocks/AudioEmbed'`):

```ts
import ConcertDates from '@/components/blocks/ConcertDates'
import type { ConcertDatesBlockFields } from '@/blocks/ConcertDates'
```

Add case after `audioEmbed` (line 92) in the `blocks` map:

```ts
concertDates: ({ node }: { node: SerializedLexicalNode & { fields: ConcertDatesBlockFields } }) => {
  return <ConcertDates dates={node.fields.dates} locale={locale as 'de' | 'en'} />
},
```

- [ ] **Step 2: Verify typecheck + lint + full test suite**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

Run: `pnpm test`
Expected: PASS (full suite)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PayloadRichText.tsx
git commit -m "feat(blocks): render concert dates block in rich text"
```

---

### Task 4: Build + manual verification

- [ ] **Step 1: Production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 2: Manual admin smoke test**

- Start dev server (`pnpm dev`), open `/admin`
- Edit any post → rich text editor → insert block → pick "Konzerttermin / Concert date"
- Add two rows: date, venue, one with event URL, one without
- Verify save works, and live preview renders a small plain list (date in current locale, venue linked when URL set)
- Switch locale, verify date format + venue translation
- Clean up: remove the test block and re-save, or delete the test post if created

- [ ] **Step 3: Optionally convert Post 240**

Decide with the user whether to migrate Post 240's hand-typed date links to the new block (this edits Post 240 content in the DB — requires explicit user confirmation before any write).