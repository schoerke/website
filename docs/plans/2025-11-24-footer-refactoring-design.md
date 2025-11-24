# Footer Refactoring Design

**Date:** 2025-11-24  
**Status:** Approved  
**Type:** Component Refactoring

## Overview

Refactor the footer into two distinct sections using a composite component pattern to improve usability and maintainability. Split into **FooterNavigation** (logo and site links) and **FooterInfo** (copyright, legal links, and social media).

## Context

The current footer combines all elements in a single component. This refactoring separates concerns and improves:
- **Usability**: Clear visual hierarchy between navigation and informational content
- **Maintainability**: Easier to test and modify individual sections
- **Future extensibility**: Social media and other info elements can be managed separately

The company address block will be moved to the artist list page (separate task) to align with the contact persons pattern on artist detail pages.

## Architecture

### Component Structure

Using a composite component pattern with three files:

```
src/components/Footer/
├── Footer.tsx              # Main orchestrator
├── FooterNavigation.tsx    # Navigation section
├── FooterInfo.tsx          # Info section
└── FooterLogo.tsx          # Existing, reused
```

**Export pattern:**
```tsx
// Footer.tsx
export default Footer
export { FooterNavigation as Navigation, FooterInfo as Info }

// Usage
import Footer from '@/components/Footer/Footer'
// or
import { Navigation, Info } from '@/components/Footer/Footer'
```

### Component Responsibilities

**Footer.tsx** (Main Component)
- Orchestrates layout and stacking
- Accepts `locale: string` prop
- Maintains `bg-primary-platinum` background
- Stacks FooterNavigation above FooterInfo
- Async server component

**FooterNavigation.tsx**
- Renders FooterLogo
- Site navigation links: Home, Artists, News, Projects, Team
- Uses i18n Link component for locale awareness
- Grid layout matching current responsive structure
- Accepts `locale: string` prop
- Async server component (for translations)

**FooterInfo.tsx**
- Copyright text with dynamic year
- Legal/privacy links: Contact, Legal Notice, Privacy Policy, Branding
- Social media icons: Facebook, Instagram, Twitter/X, YouTube
- Horizontal bar layout (stacks on mobile)
- Accepts `locale: string` prop
- Async server component (for translations)

## Data Flow & Configuration

### Translations

**Existing keys (reused):**
- `custom.pages.home.title`, `custom.pages.artists.title`, etc. - Page titles
- `custom.footer.copyright` - Copyright text

**New keys (to add):**
```typescript
// en.ts and de.ts
custom: {
  footer: {
    copyright: 'All rights reserved.', // existing
    socialMedia: {
      visitFacebook: 'Visit us on Facebook',
      visitInstagram: 'Visit us on Instagram',
      visitTwitter: 'Visit us on Twitter',
      visitYouTube: 'Visit us on YouTube',
    },
  },
}
```

### Social Media Configuration

Create `src/constants/socialMedia.ts`:

```typescript
export const SOCIAL_MEDIA_LINKS = [
  {
    platform: 'facebook',
    url: 'https://facebook.com/...',
    icon: 'Facebook',
  },
  {
    platform: 'instagram',
    url: 'https://instagram.com/...',
    icon: 'Instagram',
  },
  {
    platform: 'twitter',
    url: 'https://twitter.com/...',
    icon: 'Twitter', // or 'X'
  },
  {
    platform: 'youtube',
    url: 'https://youtube.com/...',
    icon: 'Youtube',
  },
] as const
```

**Future migration path:** These URLs can later be moved to a CMS Global collection for editor management without changing component structure.

### Link Handling

- **Internal navigation**: `@/i18n/navigation` Link component
- **Brand page**: Continue using NextLink (external pattern)
- **Social media**: Standard `<a>` tags with `target="_blank"` and `rel="noopener noreferrer"`

### Props & Types

```typescript
type FooterProps = {
  locale: string
}

type FooterNavigationProps = {
  locale: string
}

type FooterInfoProps = {
  locale: string
}
```

All components fetch their own translations using `getTranslations` and remain async server components.

## Styling & Responsive Design

### FooterNavigation Styling

**Layout:**
```tsx
<div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
  {/* Logo section */}
  {/* Navigation links */}
</div>
```

**Link styles:**
- Base: `text-gray-600`
- Hover: `hover:text-gray-800`
- Transition: `transition duration-150 ease-in-out`

**Spacing:**
- Container: `px-4 py-12 sm:px-6 lg:px-8 lg:py-16`
- List items: `space-y-3`

### FooterInfo Styling

**Layout:**
```tsx
<div className="mt-8 border-t border-gray-200 pt-8">
  <div className="flex flex-wrap justify-between items-center gap-4">
    {/* Copyright */}
    {/* Legal links */}
    {/* Social media icons */}
  </div>
</div>
```

**Elements:**
- Copyright: `text-sm text-gray-500`
- Legal links: Same style as navigation links
- Social icons: `w-6 h-6 text-gray-600 hover:text-gray-800`

### Responsive Breakpoints

- **Mobile (default)**: All content stacks vertically
- **Tablet (lg)**: FooterNavigation uses 2-column grid, FooterInfo horizontal
- **Desktop (xl)**: FooterNavigation uses 4-column grid, FooterInfo horizontal

### Icons (lucide-react)

```tsx
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react'
```

**Usage pattern:**
```tsx
<a 
  href={url} 
  aria-label={t('custom.footer.socialMedia.visitFacebook')}
  target="_blank"
  rel="noopener noreferrer"
  className="text-gray-600 hover:text-gray-800 transition duration-150 ease-in-out"
>
  <Facebook size={24} aria-hidden="true" />
</a>
```

### Accessibility

- All social media links include localized `aria-label` attributes
- SVG icons have `aria-hidden="true"` (label on anchor)
- Semantic HTML: `<footer>`, `<nav>`, `<ul>`, `<li>`
- External links include `rel="noopener noreferrer"`

## Testing Strategy

### FooterNavigation Tests

- ✓ Logo renders correctly
- ✓ All navigation links present with correct hrefs
- ✓ i18n Link components used for internal links
- ✓ Translations load correctly for both locales
- ✓ Grid layout applies responsive classes

### FooterInfo Tests

- ✓ Copyright year is dynamic (current year)
- ✓ Legal links render with correct hrefs
- ✓ Social media icons present with correct URLs
- ✓ External link attributes correct (`target="_blank"`, `rel`)
- ✓ Aria-labels present and translated

### Footer Integration Tests

- ✓ Both sections render in correct stacking order
- ✓ Responsive layout works across breakpoints
- ✓ Locale prop passes through correctly
- ✓ Background color applied to wrapper

## Error Handling

**Graceful degradation:**
- FooterLogo: Already handles missing logo (returns "Logo not found" span)
- Translations: Handled by next-intl error boundaries
- Social media: Skip rendering icon if URL is empty/undefined
- No blocking errors: Footer always renders even if parts fail

**Defensive checks:**
```typescript
{SOCIAL_MEDIA_LINKS.filter(link => link.url).map(link => ...)}
```

## Migration Path

### Phase 1: Component Refactoring (This Design)
1. Create FooterNavigation.tsx with logo and site links
2. Create FooterInfo.tsx with copyright, legal, and social media
3. Create src/constants/socialMedia.ts
4. Add social media translation keys to en.ts and de.ts
5. Refactor Footer.tsx to use composite pattern
6. Add tests for all three components
7. Verify no visual or functional regressions

### Phase 2: Address Block Migration (Separate Task)
- Remove address block from footer
- Add address block to artist list page
- Align with contactPersons component pattern

### Phase 3: CMS Integration (Future)
- Create GlobalSettings collection for social media URLs
- Update socialMedia.ts to fetch from CMS
- Add admin UI for managing social links
- No component changes required

## Future Considerations

**Extensibility:**
- Newsletter signup: Add as `Footer.Newsletter` following same pattern
- Additional sections: Easy to add new composite components
- CMS-managed content: Structure supports gradual CMS migration

**Potential enhancements:**
- Animated icon hover effects
- Social media icon color customization
- Footer theme variants (light/dark)
- Additional social platforms (LinkedIn, TikTok, etc.)

## Dependencies

**Required:**
- lucide-react (already installed)
- next-intl (already installed)
- @/i18n/navigation (already exists)

**New files:**
- `src/constants/socialMedia.ts`

**Modified files:**
- `src/components/Footer/Footer.tsx`
- `src/i18n/en.ts`
- `src/i18n/de.ts`

**New components:**
- `src/components/Footer/FooterNavigation.tsx`
- `src/components/Footer/FooterInfo.tsx`

## Success Criteria

- ✓ Footer visually matches current design with improved hierarchy
- ✓ Both sections render correctly and are responsive
- ✓ All links functional and properly localized
- ✓ Social media icons display and link correctly
- ✓ All tests pass
- ✓ No accessibility regressions
- ✓ No console errors or warnings
- ✓ Build succeeds without errors
- ✓ Lint and format checks pass

## Related Documents

- Current implementation: `src/components/Footer/Footer.tsx`
- Translation files: `src/i18n/en.ts`, `src/i18n/de.ts`
- Contact constants: `src/constants/contact.ts` (reference pattern)
