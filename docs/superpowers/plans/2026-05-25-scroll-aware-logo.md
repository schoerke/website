# Scroll-Aware Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user scrolls down, the header logo shrinks to icon-only with a smooth animated transition; scrolling back to the top reverts to the full logo.

**Architecture:** Split `HeaderLogo` into two parts: an async server component that fetches logo URLs from Payload and passes them as props, and a new `ScrollAwareLogo` client component that owns the scroll state and renders both images with CSS transitions. The layout continues to render `<HeaderLogo />` unchanged.

**Tech Stack:** Next.js App Router, React (`useEffect`, `useState`), Tailwind CSS, TypeScript

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/components/Header/ScrollAwareLogo.tsx` | Create | Client component — scroll listener, renders both logo variants with transitions |
| `src/components/Header/HeaderLogo.tsx` | Modify | Fetches URLs, passes to `ScrollAwareLogo` |
| `src/components/Header/ScrollAwareLogo.test.tsx` | Create | Tests for scroll behavior and rendering |

---

### Task 1: Create ScrollAwareLogo client component

**Files:**
- Create: `src/components/Header/ScrollAwareLogo.tsx`
- Test: `src/components/Header/ScrollAwareLogo.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/Header/ScrollAwareLogo.test.tsx`:

```typescript
// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ src, alt, style, className }: { src: string; alt: string; style?: React.CSSProperties; className?: string }) =>
    React.createElement('img', { src, alt, style, className }),
}))

import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import ScrollAwareLogo from './ScrollAwareLogo'

const defaultProps = {
  iconUrl: '/icon.svg',
  iconAlt: 'Icon logo',
  fullUrl: '/full.svg',
  fullAlt: 'Full logo',
}

describe('ScrollAwareLogo', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders both icon and full logo images', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    expect(screen.getByAltText('Icon logo')).toBeInTheDocument()
    expect(screen.getByAltText('Full logo')).toBeInTheDocument()
  })

  it('shows full logo and hides icon logo at scroll top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    const icon = screen.getByAltText('Icon logo')
    const full = screen.getByAltText('Full logo')

    expect(icon.className).toContain('opacity-0')
    expect(full.className).toContain('opacity-100')
  })

  it('shows icon logo and hides full logo after scroll', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 50 })
      window.dispatchEvent(new Event('scroll'))
    })

    const icon = screen.getByAltText('Icon logo')
    const full = screen.getByAltText('Full logo')

    expect(icon.className).toContain('opacity-100')
    expect(full.className).toContain('opacity-0')
  })

  it('reverts to full logo when scrolled back to top', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 50 })
      window.dispatchEvent(new Event('scroll'))
    })

    act(() => {
      Object.defineProperty(window, 'scrollY', { writable: true, value: 0 })
      window.dispatchEvent(new Event('scroll'))
    })

    const full = screen.getByAltText('Full logo')
    expect(full.className).toContain('opacity-100')
  })

  it('icon is smaller than full logo (height style differs)', () => {
    render(<ScrollAwareLogo {...defaultProps} />)

    const icon = screen.getByAltText('Icon logo')
    const full = screen.getByAltText('Full logo')

    expect(icon).toHaveStyle({ height: '40px' })
    expect(full).toHaveStyle({ height: '80px' })
  })

  it('removes scroll listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<ScrollAwareLogo {...defaultProps} />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test src/components/Header/ScrollAwareLogo.test.tsx --reporter=verbose
```

Expected: FAIL — `ScrollAwareLogo` does not exist yet.

- [ ] **Step 3: Create the component**

Create `src/components/Header/ScrollAwareLogo.tsx`:

```typescript
'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'

interface ScrollAwareLogoProps {
  iconUrl: string
  iconAlt: string
  fullUrl: string
  fullAlt: string
}

const ScrollAwareLogo: React.FC<ScrollAwareLogoProps> = ({ iconUrl, iconAlt, fullUrl, fullAlt }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Link href="/" aria-label="Home" className="flex items-center">
      {/* Icon-only logo: visible when scrolled */}
      <Image
        src={iconUrl}
        alt={iconAlt}
        width={120}
        height={120}
        priority
        unoptimized
        className={`transition-all duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
        style={{ width: 'auto', height: '40px' }}
      />
      {/* Full logo: visible at top */}
      <Image
        src={fullUrl}
        alt={fullAlt}
        width={400}
        height={120}
        priority
        unoptimized
        className={`transition-all duration-300 ${scrolled ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}
        style={{ width: 'auto', height: '80px' }}
      />
    </Link>
  )
}

export default ScrollAwareLogo
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/Header/ScrollAwareLogo.test.tsx --reporter=verbose
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header/ScrollAwareLogo.tsx src/components/Header/ScrollAwareLogo.test.tsx
git commit -m "feat(header): add ScrollAwareLogo client component with scroll-triggered transition"
```

---

### Task 2: Update HeaderLogo to use ScrollAwareLogo

**Files:**
- Modify: `src/components/Header/HeaderLogo.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/Header/HeaderLogo.test.tsx`:

```typescript
// @vitest-environment happy-dom

import { vi } from 'vitest'

vi.mock('@/services/media.server', () => ({
  getImageByFilename: vi.fn(),
}))

vi.mock('@/services/media', () => ({
  LOGO_ICON_FILENAME: 'schoerke-icon-logo.svg',
  LOGO_FULL_FILENAME: 'schoerke-icon-short-logo.svg',
}))

vi.mock('@/components/Header/ScrollAwareLogo', () => ({
  default: ({ iconUrl, iconAlt, fullUrl, fullAlt }: {
    iconUrl: string
    iconAlt: string
    fullUrl: string
    fullAlt: string
  }) => React.createElement('div', { 'data-testid': 'scroll-aware-logo', 'data-icon-url': iconUrl, 'data-full-url': fullUrl, 'data-icon-alt': iconAlt, 'data-full-alt': fullAlt }),
}))

import { getImageByFilename } from '@/services/media.server'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import HeaderLogo from './HeaderLogo'

const mockIcon = { url: 'https://cdn.example.com/icon.svg', alt: 'Icon' }
const mockFull = { url: 'https://cdn.example.com/full.svg', alt: 'Full logo' }

beforeEach(() => {
  vi.mocked(getImageByFilename).mockResolvedValue(null)
})

describe('HeaderLogo', () => {
  it('passes icon and full logo URLs to ScrollAwareLogo', async () => {
    vi.mocked(getImageByFilename)
      .mockResolvedValueOnce(mockIcon as never)
      .mockResolvedValueOnce(mockFull as never)

    render(await HeaderLogo())

    const logo = screen.getByTestId('scroll-aware-logo')
    expect(logo).toHaveAttribute('data-icon-url', mockIcon.url)
    expect(logo).toHaveAttribute('data-full-url', mockFull.url)
  })

  it('passes alt text to ScrollAwareLogo', async () => {
    vi.mocked(getImageByFilename)
      .mockResolvedValueOnce(mockIcon as never)
      .mockResolvedValueOnce(mockFull as never)

    render(await HeaderLogo())

    const logo = screen.getByTestId('scroll-aware-logo')
    expect(logo).toHaveAttribute('data-icon-alt', mockIcon.alt)
    expect(logo).toHaveAttribute('data-full-alt', mockFull.alt)
  })

  it('falls back to empty string URLs when images are unavailable', async () => {
    render(await HeaderLogo())

    const logo = screen.getByTestId('scroll-aware-logo')
    expect(logo).toHaveAttribute('data-icon-url', '')
    expect(logo).toHaveAttribute('data-full-url', '')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/components/Header/HeaderLogo.test.tsx --reporter=verbose
```

Expected: FAIL — `HeaderLogo` does not yet render `ScrollAwareLogo`.

- [ ] **Step 3: Rewrite HeaderLogo**

Replace `src/components/Header/HeaderLogo.tsx` with:

```typescript
import ScrollAwareLogo from '@/components/Header/ScrollAwareLogo'
import { LOGO_FULL_FILENAME, LOGO_ICON_FILENAME } from '@/services/media'
import { getImageByFilename } from '@/services/media.server'

const HeaderLogo = async () => {
  const [icon, full] = await Promise.all([
    getImageByFilename(LOGO_ICON_FILENAME),
    getImageByFilename(LOGO_FULL_FILENAME),
  ])

  return (
    <ScrollAwareLogo
      iconUrl={icon?.url ?? ''}
      iconAlt={icon?.alt ?? 'KSSchoerke Logo'}
      fullUrl={full?.url ?? ''}
      fullAlt={full?.alt ?? 'KSSchoerke Logo'}
    />
  )
}

export default HeaderLogo
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test src/components/Header/HeaderLogo.test.tsx --reporter=verbose
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Run all Header tests to confirm nothing broken**

```bash
pnpm test src/components/Header/ --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Header/HeaderLogo.tsx src/components/Header/HeaderLogo.test.tsx
git commit -m "feat(header): refactor HeaderLogo to delegate rendering to ScrollAwareLogo"
```
