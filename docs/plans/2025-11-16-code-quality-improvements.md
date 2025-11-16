# Code Quality Improvements Plan

**Date:** 2025-11-16
**Status:** Planned
**Type:** Technical Debt & Code Quality

## Context

Following a comprehensive code review, several areas for improvement have been identified across security, type safety,
testing, error handling, and accessibility. This document tracks remaining issues after critical security fixes have
been implemented.

## Critical Security Fixes ✅ COMPLETED

The following critical security issues have been resolved:

1. ✅ **Users Collection Access Control** - Restricted to authenticated users only
2. ✅ **Employees Collection Access Control** - Added proper access control
3. ✅ **URL Validation & Sanitization** - Comprehensive validators for all URL fields
4. ✅ **Environment Variable Handling** - Centralized config with proper defaults

### Files Created

- `src/validators/fields.ts` - Reusable field validators
- `src/config/env.ts` - Environment configuration
- `.env.example` - Documentation for required env vars

### Files Updated

- `src/collections/Users.ts` - Fixed access control
- `src/collections/Employees.ts` - Added access control
- `src/collections/Artists.ts` - Using new validators
- `src/components/Artist/ArtistCard.tsx` - Using env config
- `src/app/(frontend)/[locale]/team/page.tsx` - Using env config

---

## 🟠 HIGH Priority Issues

### 1. Excessive `any` Type Usage (27 occurrences)

**Problem:** Defeats TypeScript's type safety, loses IDE support and compile-time checks.

**Locations:**

- `src/app/(frontend)/[locale]/artists/page.tsx:29, 42, 66` - Using `any` for artist type
- `src/components/Artist/ArtistGrid.tsx:10` - `image?: any`
- `src/components/ui/ClientRichText.tsx:4` - `content: any`
- `src/components/ui/PayloadRichText.tsx:6` - `content: any`

**Solution:**

```typescript
// Instead of:
const artists: any[] = []

// Use proper types:
import type { Artist, Media } from '@/payload-types'

type ArtistListItem = Pick<Artist, 'id' | 'name' | 'slug' | 'instrument'> & {
  image?: number | Media
}

// For RichText:
import type { SerializedEditorState } from 'lexical'

interface ClientRichTextProps {
  content: SerializedEditorState | null | undefined
  className?: string
}
```

**Effort:** Medium
**Impact:** High - Improves type safety and developer experience

---

### 2. No Error Boundaries

**Problem:** If any component throws an error, the entire application crashes with no graceful degradation.

**Solution:** Add React Error Boundary at layout level

```typescript
// src/components/ErrorBoundary.tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Error caught:', error, info)
    // TODO: Log to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
            <p className="mt-2">Bitte laden Sie die Seite neu.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// In layout.tsx
<ErrorBoundary>
  <Header />
  <main>{children}</main>
  <Footer />
</ErrorBoundary>
```

**Effort:** Low
**Impact:** High - Better user experience, prevents full app crashes

---

### 3. Client-Side Random Shuffle Creates Hydration Mismatch Risk

**Location:** `src/app/(frontend)/[locale]/artists/page.tsx:32-39`

**Problem:** Server-side shuffle differs from client-side, causing hydration warnings and layout shifts.

**Current Code:**

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)) // Non-deterministic!
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
```

**Solution Option 1: Seed-based deterministic shuffle**

```typescript
// Use date as seed for daily rotation
function seededShuffle<T>(array: T[]): T[] {
  const seed = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  // Use seed for deterministic random
  const rng = createSeededRandom(seed)
  // ... shuffle with rng()
}
```

**Solution Option 2: Client-only component**

```typescript
'use client'
function ArtistsSlider({ artists }: { artists: Artist[] }) {
  const [shuffled, setShuffled] = useState(artists)

  useEffect(() => {
    setShuffled(shuffleArray(artists))
  }, [artists])

  return <ImageSlider images={shuffled} />
}
```

**Effort:** Medium
**Impact:** High - Prevents hydration errors and improves UX

---

### 4. No Data Caching Strategy

**Problem:** Every page load queries the database directly, causing unnecessary load and slower responses.

**Solution:** Implement Next.js caching

```typescript
// Option 1: Page-level revalidation
export const revalidate = 3600 // 1 hour

// Option 2: unstable_cache wrapper
import { unstable_cache } from 'next/cache'

export const getArtistListData = unstable_cache(
  async (payload: Payload, locale?: LocaleCode) => {
    return await payload.find({
      collection: 'artists',
      select: { name: true, image: true, instrument: true, id: true, slug: true },
      locale: locale || 'de',
    })
  },
  ['artist-list'],
  { revalidate: 3600, tags: ['artists'] },
)

// Revalidate on-demand when content changes
revalidateTag('artists')
```

**Effort:** Medium
**Impact:** High - Improves performance and reduces database load

---

### 5. Inconsistent Error Handling Pattern

**Problem:** Errors are only logged to console with generic messages. No monitoring, retry logic, or helpful user
feedback.

**Locations:** All page components (`artists/page.tsx`, `team/page.tsx`, etc.)

**Current Pattern:**

```typescript
try {
  const payload = await getPayload({ config })
  const result = await getArtistListData(payload, locale)
  artists = result?.docs || []
} catch (e) {
  console.error('Error loading artists:', e) // Only logs!
  error = 'Failed to load artists.'
}
```

**Solution:**

```typescript
import { logError } from '@/utils/monitoring'

try {
  const payload = await getPayload({ config })
  const result = await getArtistListData(payload, locale)
  artists = result?.docs || []
} catch (e) {
  const errorMessage = e instanceof Error ? e.message : 'Unknown error'

  // Log to monitoring service
  logError('Failed to load artists', {
    error: e,
    locale,
    component: 'ArtistsPage',
  })

  // Localized error message
  error = t('errors.loadArtistsFailed')
}

// Create monitoring utility
// src/utils/monitoring.ts
export function logError(message: string, context?: Record<string, any>) {
  console.error(message, context)
  // TODO: Integrate with Sentry, LogRocket, etc.
  // Sentry.captureException(context.error, { extra: context })
}
```

**Effort:** Medium
**Impact:** High - Better debugging, user feedback, and production monitoring

---

## 🟡 MEDIUM Priority Issues

### 6. Magic Numbers Without Constants

**Locations:**

- `posts.ts:76` - `interval: 100`
- `artists/page.tsx:61` - `interval={6000}`
- `ImageSlider.tsx:18` - `interval = 4000`

**Solution:**

```typescript
// src/constants/ui.ts
export const AUTOSAVE_INTERVAL_MS = 100
export const SLIDER_INTERVAL_MS = 6000
export const IMAGE_SLIDER_DEFAULT_INTERVAL_MS = 6000
```

**Effort:** Low
**Impact:** Medium - Improves maintainability

---

### 7. Inconsistent Type Guard Patterns

**Problem:** Different type guard implementations across the codebase.

**Solution:** Create shared utilities or use Zod

```typescript
// src/utils/typeGuards.ts
import { z } from 'zod'
import type { Media, Employee } from '@/payload-types'

export const MediaSchema = z.object({
  url: z.string(),
  filename: z.string().optional(),
  alt: z.string().optional(),
})

export function isMedia(obj: unknown): obj is Media {
  return MediaSchema.safeParse(obj).success
}
```

**Effort:** Medium
**Impact:** Medium - Consistency and runtime validation

---

### 8. Commented-Out Code in Production

**Location:** `src/payload.config.ts:19-20`

```typescript
// v2: Newsletter Contact Management
// import { NewsletterContacts } from './collections/NewsletterContacts'
```

**Solution:** Remove or track in issue tracker

**Effort:** Low
**Impact:** Low - Code cleanliness

---

### 9. Redundant Component Wrapper

**Location:** `src/components/ui/ClientRichText.tsx`

**Problem:** Serves no purpose, just wraps PayloadRichText

**Solution:** Remove `ClientRichText.tsx` and mark `PayloadRichText` as client component

```typescript
// PayloadRichText.tsx
'use client'
export default function PayloadRichText({ content, className }: Props) {
  if (!content) return null
  return <RichText className={className} data={content} />
}
```

**Effort:** Low
**Impact:** Low - Code simplification

---

### 10. Prop Drilling in Footer

**Location:** `src/app/(frontend)/[locale]/layout.tsx:38`

**Problem:** Passing locale as prop when it's available via hook

**Solution:**

```typescript
// Footer.tsx - Make it client component
'use client'
import { useLocale } from 'next-intl'

const Footer: React.FC = () => {
  const locale = useLocale()
  // ...
}

// layout.tsx
<Footer />  // No props needed
```

**Effort:** Low
**Impact:** Low - Cleaner component API

---

### 11. Inconsistent Component Declaration Pattern

**Problem:** AGENTS.md convention doesn't account for async server components

**Current Convention:**

```typescript
const ComponentName: React.FC<Props> = (props) => { ... }
```

**Issue:** Can't use `React.FC` with async server components

**Solution:** Update AGENTS.md

```markdown
- **React Components:**
  - Client components: `const ComponentName: React.FC<Props> = (props) => { ... }`
  - Server components (async): `const ComponentName = async (props: Props) => { ... }`
  - Always `export default ComponentName` at end of file
```

**Effort:** Low
**Impact:** Low - Documentation clarity

---

### 12. Missing Prop Types Export

**Problem:** Component prop types not exported, making reuse harder

**Solution:**

```typescript
// Export all prop interfaces
export interface ArtistCardProps {
  id: string
  name: string
  instrument?: string[]
  image?: number | null | Media
  slug?: string
}

const ArtistCard: React.FC<ArtistCardProps> = ({ ... }) => {
```

**Effort:** Low
**Impact:** Medium - Better component reusability

---

## 🟢 LOW Priority Issues

### 13. Incomplete Locale Coverage in Quote Marks

**Location:** `src/utils/content.ts:1-9`

**Enhancement:** Add more locales

```typescript
export function getQuoteMarks(locale: string): [string, string] {
  const quoteMarks: Record<string, [string, string]> = {
    de: ['„', '"'],
    en: ['"', '"'],
    fr: ['«\u00A0', '\u00A0»'],
    es: ['«', '»'],
    it: ['«', '»'],
  }
  return quoteMarks[locale] ?? ['"', '"']
}
```

**Effort:** Low
**Impact:** Low - Future-proofing

---

### 14. Hardcoded Strings Need i18n

**Locations:**

- `InstrumentFilter.tsx` - "Filter artists by instrument"
- `artists/page.tsx:64` - "No artists found."
- `ArtistGrid.tsx:33` - "No artists found for these instruments."

**Solution:**

```typescript
// de.ts
noArtistsFound: 'Keine Künstler gefunden.',
noArtistsForInstruments: 'Keine Künstler für diese Instrumente gefunden.',
filterByInstrument: 'Künstler nach Instrument filtern',

// en.ts
noArtistsFound: 'No artists found.',
noArtistsForInstruments: 'No artists found for these instruments.',
filterByInstrument: 'Filter artists by instrument',
```

**Effort:** Low
**Impact:** Low - Proper i18n completion

---

### 15. Incomplete Accessibility Implementation

**Issues:**

1. **ImageSlider links** - `tabIndex={-1}` should be `0` for keyboard navigation
2. **Missing ARIA labels** - Banner text needs proper roles
3. **Form validation** - Messages not announced to screen readers
4. **Skip links** - No skip navigation for keyboard users

**Solutions:**

```typescript
// 1. ImageSlider.tsx
<Link href={img.link} tabIndex={0} aria-label={img.bannerText || img.alt}>

// 2. ImageSlide.tsx
{image.bannerText && (
  <div
    className="..."
    role="img"
    aria-label={`Artist: ${image.bannerText}`}
  >
    {image.bannerText}
  </div>
)}

// 3. Add skip link in Header.tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

// 4. Add id to main content
<main id="main-content">{children}</main>
```

**Effort:** Medium
**Impact:** Medium - Better accessibility compliance

---

### 16. Missing JSDoc Comments

**Problem:** No inline documentation for component props and complex functions

**Solution:**

```typescript
interface ArtistCardProps {
  /** Unique identifier for the artist */
  id: string
  /** Full name of the artist */
  name: string
  /** List of instruments the artist plays */
  instrument?: string[]
  /** Profile image - can be ID or full Media object */
  image?: number | null | Media
  /** URL-friendly slug for artist detail page */
  slug?: string
}

/**
 * Displays an artist card with image, name, and instruments.
 * Links to artist detail page if slug is provided.
 *
 * @example
 * <ArtistCard
 *   id="1"
 *   name="John Doe"
 *   instrument={['piano']}
 *   slug="john-doe"
 * />
 */
const ArtistCard: React.FC<ArtistCardProps> = ({ ... }) => {
```

**Effort:** Medium
**Impact:** Low - Better developer experience

---

## 🧪 CRITICAL: Testing Infrastructure Gap

### Problem

**Zero test files found in the codebase.**

**Impact:**

- No confidence in refactoring
- Bugs slip through to production
- Component behavior undocumented
- Regression risks with every change

### Solution: Implement Testing Strategy

**1. Install Testing Tools**

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**2. Configure Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**3. Priority Test Coverage**

**Phase 1: Unit Tests (Week 1)**

- Type guards (`isMedia`, `isEmployee`)
- Validators (YouTube URL, quotes, general URLs)
- Utility functions (`getQuoteMarks`, `shuffleArray`)

```typescript
// __tests__/validators/fields.test.ts
import { validateYouTubeURL } from '@/validators/fields'

describe('validateYouTubeURL', () => {
  it('accepts valid youtube.com URLs', () => {
    expect(validateYouTubeURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
  })

  it('accepts valid youtu.be URLs', () => {
    expect(validateYouTubeURL('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('rejects invalid URLs', () => {
    expect(validateYouTubeURL('https://example.com')).toBe('Please enter a valid YouTube URL')
  })
})
```

**Phase 2: Component Tests (Week 2)**

- ArtistCard rendering
- InstrumentFilter state management
- LanguageSwitcher locale switching

```typescript
// __tests__/components/ArtistCard.test.tsx
import { render, screen } from '@testing-library/react'
import ArtistCard from '@/components/Artist/ArtistCard'

describe('ArtistCard', () => {
  it('renders artist name and instruments', () => {
    render(
      <ArtistCard
        id="1"
        name="Test Artist"
        instrument={['piano']}
        slug="test-artist"
      />
    )

    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByText('Piano')).toBeInTheDocument()
  })

  it('links to artist detail page when slug provided', () => {
    render(
      <ArtistCard
        id="1"
        name="Test Artist"
        slug="test-artist"
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/artists/test-artist')
  })
})
```

**Phase 3: Integration Tests (Week 3)**

- Artist list page with filtering
- Artist detail page data loading
- Team page employee display

**Target Coverage:**

- Phase 1: 50% coverage
- Phase 2: 70% coverage
- Phase 3: 80% coverage

**Effort:** High
**Impact:** Critical - Enables confident refactoring and prevents regressions

---

## Implementation Timeline

### Week 1 (Immediate)

- [ ] Add error boundaries to layout
- [ ] Reduce `any` usage in top 5 files
- [ ] Extract magic numbers to constants
- [ ] Set up Vitest configuration

### Week 2 (This Sprint)

- [ ] Fix hydration mismatch in shuffle
- [ ] Implement data caching strategy
- [ ] Write unit tests for validators and utilities
- [ ] Improve error handling with monitoring setup

### Week 3-4 (Next Sprint)

- [ ] Write component tests
- [ ] Add accessibility improvements
- [ ] Complete i18n for hardcoded strings
- [ ] Fix inconsistent type guards

### Month 2

- [ ] Write integration tests
- [ ] Complete JSDoc documentation
- [ ] Eliminate remaining `any` types
- [ ] Clean up code smells (redundant wrappers, prop drilling)

---

## Success Metrics

| Metric                           | Current | Target        |
| -------------------------------- | ------- | ------------- |
| TypeScript `any` usage           | 27      | 0             |
| Test coverage                    | 0%      | 80%           |
| Error boundaries                 | 0       | Full coverage |
| Cached queries                   | 0%      | 100%          |
| Accessibility score (Lighthouse) | Unknown | >90           |
| Hardcoded strings                | ~10     | 0             |

---

## References

- Original code review: Code-reviewer agent output (2025-11-16)
- TypeScript Best Practices: <https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html>
- Next.js Caching: <https://nextjs.org/docs/app/building-your-application/caching>
- Testing Library: <https://testing-library.com/docs/react-testing-library/intro>
- WCAG 2.1 Guidelines: <https://www.w3.org/WAI/WCAG21/quickref/>
