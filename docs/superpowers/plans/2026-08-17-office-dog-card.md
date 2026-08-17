# Office Dog Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Append a static "Yuki, Office Dog/Bürohund" card to the end of the team grid on the contact pages, reusing `TeamMemberCard`, using the existing `IMG_8115.JPG` image from the images collection.

**Architecture:** `getContactPageData` additionally fetches the dog image by filename and two i18n strings; `ContactPageLayout` receives `dogImage`/`dogName`/`dogTitle` props and renders one extra `TeamMemberCard` (with empty contact fields) as the last grid cell when the image exists. No employee record, schema, or DB changes.

**Tech Stack:** Next.js App Router, Payload CMS Local API, next-intl, Tailwind, Vitest + Testing Library (happy-dom).

**Spec:** `docs/superpowers/specs/2026-08-17-office-dog-card-design.md`

---

## File Structure

- `src/i18n/en.ts` — add `dogName`/`dogTitle` to `custom.pages.team` (lines 154-158)
- `src/i18n/de.ts` — same, German values (lines 157-161)
- `src/app/(frontend)/[locale]/_lib/contactPageData.ts` — add dog image fetch + dog i18n strings
- `src/app/(frontend)/[locale]/_lib/contactPageData.spec.ts` — cover new fields
- `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx` — accept + render dog card
- `src/app/(frontend)/[locale]/_components/ContactPageLayout.spec.tsx` — new test file
- `src/app/(frontend)/[locale]/contact/page.tsx` — forward dog props
- `src/app/(frontend)/[locale]/kontakt/page.tsx` — forward dog props

---

### Task 1: Add dog i18n strings

**Files:**
- Modify: `src/i18n/en.ts:154-158`
- Modify: `src/i18n/de.ts:157-161`

- [ ] **Step 1: Add English strings**

Edit `src/i18n/en.ts`:

```ts
      team: {
        title: 'Team',
        phone: 'Phone',
        mobile: 'Mobile',
        dogName: 'Yuki',
        dogTitle: 'Office Dog',
      },
```

- [ ] **Step 2: Add German strings**

Edit `src/i18n/de.ts`:

```ts
      team: {
        title: 'Team',
        phone: 'Telefon',
        mobile: 'Mobil',
        dogName: 'Yuki',
        dogTitle: 'Bürohund',
      },
```

- [ ] **Step 3: Verify**

Run: `grep -n "dogName\|dogTitle" src/i18n/en.ts src/i18n/de.ts`
Expected: each file shows `dogName: 'Yuki'` and a `dogTitle`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.ts src/i18n/de.ts
git commit -m "feat(i18n): add office dog name and title strings"
```

---

### Task 2: Extend `getContactPageData` with dog image + strings

**Files:**
- Modify: `src/app/(frontend)/[locale]/_lib/contactPageData.ts`
- Test: `src/app/(frontend)/[locale]/_lib/contactPageData.spec.ts`

- [ ] **Step 1: Write the failing tests**

In `contactPageData.spec.ts`, change the `getImageByFilename` mock in `beforeEach` to return distinct images per filename (lines 37):

```ts
    vi.mocked(getImageByFilename).mockImplementation(async (filename: string) => {
      if (filename === 'IMG_8115.JPG') {
        return { id: 2, url: '/dog.jpg', alt: 'Yuki', updatedAt: '', createdAt: '' } as never
      }
      return mockImage as never
    })
```

Add these test cases after the existing ones (after line 69):

```ts
  it('fetches the dog image by filename', async () => {
    await getContactPageData('en')

    expect(getImageByFilename).toHaveBeenCalledWith('IMG_8115.JPG')
  })

  it('returns dog image, dog name and dog title', async () => {
    const result = await getContactPageData('en')

    expect(result.dogImage?.url).toBe('/dog.jpg')
    expect(result.dogName).toBe('dogName')
    expect(result.dogTitle).toBe('dogTitle')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/app/\(frontend\)/\[locale\]/_lib/contactPageData.spec.ts`
Expected: FAIL — `result.dogImage` is `undefined` (key does not exist on return object).

- [ ] **Step 3: Implement**

Replace `contactPageData.ts` with:

```ts
import { getEmployees } from '@/services/employee'
import { getImageByFilename } from '@/services/media.server'
import { getPageBySlug } from '@/services/page'
import { getTranslations } from 'next-intl/server'

export async function getContactPageData(locale: 'de' | 'en') {
  const t = await getTranslations({ locale, namespace: 'custom.pages.team' })

  const [teamPage, employeesResult, wiesbadenImage, dogImage] = await Promise.all([
    getPageBySlug('team', locale),
    getEmployees(locale),
    getImageByFilename('wiesbaden.webp'),
    getImageByFilename('IMG_8115.JPG'),
  ])

  return {
    teamPage,
    employees: employeesResult.docs,
    wiesbadenImage,
    dogImage,
    dogName: t('dogName'),
    dogTitle: t('dogTitle'),
    phoneLabel: t('phone'),
    mobileLabel: t('mobile'),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/app/\(frontend\)/\[locale\]/_lib/contactPageData.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/_lib/contactPageData.ts src/app/\(frontend\)/\[locale\]/_lib/contactPageData.spec.ts
git commit -m "feat(team): fetch dog card data in contact page data"
```

---

### Task 3: Render dog card in `ContactPageLayout` + forward props in pages

**Files:**
- Modify: `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx`
- Test: `src/app/(frontend)/[locale]/_components/ContactPageLayout.spec.tsx` (new)
- Modify: `src/app/(frontend)/[locale]/contact/page.tsx`
- Modify: `src/app/(frontend)/[locale]/kontakt/page.tsx`

- [ ] **Step 1: Write the failing test file**

Create `src/app/(frontend)/[locale]/_components/ContactPageLayout.spec.tsx`:

```tsx
// @vitest-environment happy-dom

import { createMockEmployee, createMockImage } from '@/tests/utils/payloadMocks'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ContactPageLayout from './ContactPageLayout'

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}))

const baseProps = {
  title: 'Contact',
  locale: 'en' as const,
  phoneLabel: 'Phone',
  mobileLabel: 'Mobile',
  employees: [createMockEmployee({ id: 1, name: 'Jane Smith', title: 'Senior Manager' })],
}

describe('ContactPageLayout', () => {
  it('renders dog card when dogImage is provided', () => {
    render(
      <ContactPageLayout
        {...baseProps}
        dogImage={createMockImage({ id: 99, url: '/dog.jpg', alt: 'Yuki' })}
        dogName="Yuki"
        dogTitle="Office Dog"
      />,
    )

    expect(screen.getByText('Yuki')).toBeInTheDocument()
    expect(screen.getByText('Office Dog')).toBeInTheDocument()
    expect(screen.getByAltText('Yuki')).toHaveAttribute('src', '/dog.jpg')
  })

  it('renders employee cards', () => {
    render(<ContactPageLayout {...baseProps} />)

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Senior Manager')).toBeInTheDocument()
  })

  it('does not render dog card when dogImage is missing', () => {
    render(<ContactPageLayout {...baseProps} dogImage={null} dogName="Yuki" dogTitle="Office Dog" />)

    expect(screen.queryByText('Office Dog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.spec.tsx`
Expected:
  - `renders employee cards` PASSES
  - `renders dog card when dogImage is provided` FAILS (`Unable to find text Yuki`)
  - `does not render dog card when dogImage is missing` PASSES (accidentally — becomes meaningful once the dog card renders when image present)

- [ ] **Step 3: Implement layout change**

In `ContactPageLayout.tsx`:

1. Add to the props interface (after `employees?: Employee[]`):

```ts
  dogImage?: PayloadImage | null
  dogName?: string
  dogTitle?: string
```

2. Add to destructuring (after `mobileLabel = 'Mobile',`):

```ts
  dogImage,
  dogName,
  dogTitle,
```

3. Append the dog card inside the grid, after the `employees.map(...)` block (after line 69):

```tsx
            {dogImage && (
              <TeamMemberCard
                id={-1}
                name={dogName || 'Yuki'}
                title={dogTitle || 'Office Dog'}
                image={dogImage}
                email=""
                phone=""
                mobile=""
                phoneLabel={phoneLabel}
                mobileLabel={mobileLabel}
              />
            )}
```

- [ ] **Step 4: Render on both pages**

In `src/app/(frontend)/[locale]/contact/page.tsx`, change the destructure (line 14) to include the new keys:

```ts
  const [t, { teamPage, employees, wiesbadenImage, dogImage, dogName, dogTitle, phoneLabel, mobileLabel }] =
    await Promise.all([
      getTranslations({ locale, namespace: 'custom.pages.contact' }),
      getContactPageData(locale as 'de' | 'en'),
    ])
```

and add to the `<ContactPageLayout>` props (after `employees={employees}`):

```tsx
      dogImage={dogImage}
      dogName={dogName}
      dogTitle={dogTitle}
```

Apply the identical two edits in `src/app/(frontend)/[locale]/kontakt/page.tsx` (destructure line 14, props after `employees={employees}` on line 25).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.spec.tsx`
Expected: PASS (3 tests). Also run `pnpm test src/app/\(frontend\)/\[locale\]/_lib/contactPageData.spec.ts` — still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.tsx src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.spec.tsx src/app/\(frontend\)/\[locale\]/contact/page.tsx src/app/\(frontend\)/\[locale\]/kontakt/page.tsx
git commit -m "feat(team): append office dog card to team grid"
```

---

### Task 4: Full verification

**Files:** none

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 4: Fix anything that surfaced, then re-run Steps 1-3 until green.**

- [ ] **Step 5: Report to user for manual review** — no commit (per repo policy, wait for user approval before committing further work).

---

### Task 5: Grayscale dog image prop (TDD)

**Revision note:** Design decision 2026-08-17 — dog card image must be permanently
grayscale. `TeamMemberCard` gets an optional `grayscale?: boolean` prop instead of a new
component. See spec §Revision.

**Files:**
- Modify: `src/components/Employee/TeamMemberCard.tsx`
- Test: `src/components/Employee/TeamMemberCard.spec.tsx`
- Modify: `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `TeamMemberCard.spec.tsx` (before the closing `})`):

```tsx
  it('applies grayscale class to image when grayscale prop is true', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" grayscale={true} />)
    const img = screen.getByAltText('Jane Smith')
    expect(img).toHaveAttribute('class', expect.stringContaining('grayscale'))
  })

  it('omits grayscale class when grayscale prop is false', () => {
    render(<TeamMemberCard {...defaultEmployee} phoneLabel="Phone" mobileLabel="Mobile" />)
    const img = screen.getByAltText('Jane Smith')
    expect(img).not.toHaveAttribute('class', expect.stringContaining('grayscale'))
  })
```

Also in `src/app/(frontend)/[locale]/_components/ContactPageLayout.spec.tsx`, extend the
"renders dog card when dogImage is provided" test to assert the dog card image carries the
grayscale class (the dog card is the only one that does):

```tsx
    expect(screen.getByAltText('Yuki')).toHaveAttribute('class', expect.stringContaining('grayscale'))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/Employee/TeamMemberCard.spec.tsx src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.spec.tsx`
Expected: the two new `TeamMemberCard` tests FAIL (no `grayscale` prop exists yet, the mock
`<img>` renders no class). The `ContactPageLayout` assertion FAILS (no grayscale class).

- [ ] **Step 3: Implement**

In `src/components/Employee/TeamMemberCard.tsx`:

1. Add to the props interface (after `priority?: boolean`):

```ts
  grayscale?: boolean
```

2. Add to destructuring (after `priority = false,`):

```ts
  grayscale = false,
```

3. Change the `Image` className (line 33) from:

```tsx
          className="h-full w-full object-cover"
```

to:

```tsx
          className={`h-full w-full object-cover${grayscale ? ' grayscale' : ''}`}
```

4. In `src/app/(frontend)/[locale]/_components/ContactPageLayout.tsx`, add `grayscale` to
   the dog card `<TeamMemberCard>` (after `mobileLabel={mobileLabel}`):

```tsx
                grayscale
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/components/Employee/TeamMemberCard.spec.tsx src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Full verification**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test`
Expected: all green (test count grows by 2).

- [ ] **Step 6: Commit**

```bash
git add src/components/Employee/TeamMemberCard.tsx src/components/Employee/TeamMemberCard.spec.tsx src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.tsx src/app/\(frontend\)/\[locale\]/_components/ContactPageLayout.spec.tsx docs/superpowers/specs/2026-08-17-office-dog-card-design.md docs/superpowers/plans/2026-08-17-office-dog-card.md
git commit -m "feat(team): grayscale office dog card image"
```