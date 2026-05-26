# Homepage Carousel Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contact info sidebar next to the homepage news carousel on desktop (`lg+`), hiding it on mobile, so the carousel is naturally narrower on large screens and viewport-friendly on small screens.

**Architecture:** New `HomePageSidebar` server component with hardcoded contact info. Homepage news section wrapped in a CSS grid (`grid-cols-[65fr_35fr]` at `lg`). No new data fetching.

**Tech Stack:** Next.js App Router, Tailwind CSS, TypeScript, Vitest + Testing Library

---

## File Map

| Action | File |
|--------|------|
| Create | `src/components/HomePageSidebar/HomePageSidebar.tsx` |
| Create | `src/components/HomePageSidebar/HomePageSidebar.test.tsx` |
| Modify | `src/app/(frontend)/[locale]/page.tsx` |

---

### Task 1: Create `HomePageSidebar` component

**Files:**
- Create: `src/components/HomePageSidebar/HomePageSidebar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import SchoerkeLink from '@/components/ui/SchoerkeLink'

const HomePageSidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:gap-6">
      <div>
        <h2 className="font-playfair mb-3 text-xl font-bold">Künstlersekretariat Astrid Schoerke GmbH</h2>
        <address className="not-italic text-gray-600 text-sm leading-relaxed space-y-1">
          <p>Emanuel-Geibel-Str. 10</p>
          <p>D-65185 Wiesbaden</p>
          <p>
            <SchoerkeLink href="mailto:info@ks-schoerke.de" variant="animated" className="text-sm">
              info@ks-schoerke.de
            </SchoerkeLink>
          </p>
          <p>
            <SchoerkeLink href="tel:+4906115058950" variant="animated" className="text-sm">
              +49 (0)611-50 58 90 50
            </SchoerkeLink>
          </p>
        </address>
      </div>
    </aside>
  )
}

export default HomePageSidebar
```

- [ ] **Step 2: Verify file exists and has no syntax errors**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | grep HomePageSidebar
```

Expected: no output (no errors)

---

### Task 2: Write tests for `HomePageSidebar`

**Files:**
- Create: `src/components/HomePageSidebar/HomePageSidebar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'
import HomePageSidebar from './HomePageSidebar'

vi.mock('@/components/ui/SchoerkeLink', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

describe('HomePageSidebar', () => {
  it('renders agency name', () => {
    render(<HomePageSidebar />)
    expect(screen.getByText('Künstlersekretariat Astrid Schoerke GmbH')).toBeInTheDocument()
  })

  it('renders street address', () => {
    render(<HomePageSidebar />)
    expect(screen.getByText('Emanuel-Geibel-Str. 10')).toBeInTheDocument()
  })

  it('renders city', () => {
    render(<HomePageSidebar />)
    expect(screen.getByText('D-65185 Wiesbaden')).toBeInTheDocument()
  })

  it('renders email link', () => {
    render(<HomePageSidebar />)
    const link = screen.getByText('info@ks-schoerke.de').closest('a')
    expect(link).toHaveAttribute('href', 'mailto:info@ks-schoerke.de')
  })

  it('renders phone link', () => {
    render(<HomePageSidebar />)
    const link = screen.getByText('+49 (0)611-50 58 90 50').closest('a')
    expect(link).toHaveAttribute('href', 'tel:+4906115058950')
  })

  it('has hidden class on mobile (lg:flex)', () => {
    const { container } = render(<HomePageSidebar />)
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('hidden')
    expect(aside?.className).toContain('lg:flex')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/components/HomePageSidebar/HomePageSidebar.test.tsx
```

Expected: FAIL — module not found or similar

- [ ] **Step 3: Run tests again after Task 1 component exists**

```bash
pnpm test src/components/HomePageSidebar/HomePageSidebar.test.tsx
```

Expected: all 6 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/HomePageSidebar/HomePageSidebar.tsx src/components/HomePageSidebar/HomePageSidebar.test.tsx
git commit -m "feat: add HomePageSidebar with hardcoded contact info"
```

---

### Task 3: Update homepage layout to use grid with sidebar

**Files:**
- Modify: `src/app/(frontend)/[locale]/page.tsx`

- [ ] **Step 1: Add import for HomePageSidebar**

At the top of `src/app/(frontend)/[locale]/page.tsx`, add after existing imports:

```tsx
import HomePageSidebar from '@/components/HomePageSidebar/HomePageSidebar'
```

- [ ] **Step 2: Wrap carousel in grid**

Find this block (lines 69–74):

```tsx
{newsSlides.length > 0 && (
  <section className="mb-16">
    <h2 className="font-playfair mb-8 text-4xl font-bold sm:text-5xl">{t('newsHeading')}</h2>
    <HomePageSlider slides={newsSlides} interval={9000} />
  </section>
)}
```

Replace with:

```tsx
{newsSlides.length > 0 && (
  <section className="mb-16">
    <h2 className="font-playfair mb-8 text-4xl font-bold sm:text-5xl">{t('newsHeading')}</h2>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[65fr_35fr]">
      <HomePageSlider slides={newsSlides} interval={9000} />
      <HomePageSidebar />
    </div>
  </section>
)}
```

- [ ] **Step 3: Update `sizes` prop in `HomePageSlider` for correct image sizing**

In `src/components/HomePageSlider/HomePageSlider.tsx`, update the `sizes` prop on the `<Image>` component (line 129):

```tsx
sizes="(max-width: 1024px) 100vw, 65vw"
```

This ensures Next.js requests appropriately sized images now that the carousel is ~65% width on desktop.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass

- [ ] **Step 6: Lint**

```bash
pnpm lint
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/app/(frontend)/[locale]/page.tsx src/components/HomePageSlider/HomePageSlider.tsx
git commit -m "feat: homepage carousel sidebar layout with 65/35 grid at lg breakpoint"
```
