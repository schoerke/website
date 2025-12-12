# ArtistLinks Component Design

**Date:** 2025-12-12  
**Status:** Design Complete  
**Related Files:** Artist detail page, Artists collection schema

## Overview

New component for the artist detail page sidebar that displays the artist's homepage, social media links, and
downloadable resources (Biography PDF, Photo Gallery ZIP). Positioned below ContactPersons in the sidebar.

## Requirements

- Display homepage link with "Homepage" header
- Show social media icons (Facebook, Twitter/X, Instagram, YouTube, Spotify) in horizontal row
- Include up to 2 downloads (Biography PDF, Gallery ZIP) with icons and labels
- Only render sections/items when data exists
- Match ContactPersons styling for visual consistency
- Responsive: horizontal social icons wrap on mobile, same order as desktop
- Use Lucide icons (no emojis)
- Social icons: visual icons only (no visible labels), aria-labels for screen readers

## Architecture

### Compound Component Pattern

Split into focused sub-components for maintainability and testability:

```
src/components/ArtistLinks/
  index.tsx                    # Main component composition
  ArtistLinksHomepage.tsx      # Homepage section
  ArtistLinksSocial.tsx        # Social media icons
  ArtistLinksDownloads.tsx     # Download links
  ArtistLinks.spec.tsx         # Component tests
  ArtistLinksHomepage.spec.tsx
  ArtistLinksSocial.spec.tsx
  ArtistLinksDownloads.spec.tsx
```

**Why compound pattern:**

- Each sub-component handles one concern
- Highly testable in isolation
- Clear separation of conditional rendering logic
- Easy to modify individual sections

## Component Specifications

### Main Component (`index.tsx`)

**Props:**

```typescript
interface ArtistLinksProps {
  homepageURL?: string | null
  socialMedia?: {
    facebookURL?: string | null
    instagramURL?: string | null
    twitterURL?: string | null
    youtubeURL?: string | null
    spotifyURL?: string | null
  }
  downloads?: {
    biographyPDF?: Document | number | null
    galleryZIP?: Document | number | null
  }
  locale?: 'de' | 'en'
}
```

**Behavior:**

- Returns `null` if no homepage, no social URLs, and no downloads exist
- Composes three sub-components with consistent spacing (`space-y-4` or `space-y-6`)
- Matches ContactPersons styling: `<section className="sm:text-left md:text-right">`

### ArtistLinksHomepage Component

**Props:** `homepageURL?: string | null`, `locale?: 'de' | 'en'`

**Rendering:**

- Only renders if `homepageURL` exists
- Header: "Homepage" (translatable via next-intl)
- Link with `ExternalLink` icon (lucide-react)
- Displays clean domain (strips protocol/www)
- Opens in new tab: `target="_blank" rel="noopener noreferrer"`
- Right-aligned on desktop, left-aligned mobile

**Helper Function:**

```typescript
function formatDomain(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '')
}
```

### ArtistLinksSocial Component

**Props:** `socialMedia` object with 5 platform URLs

**Rendering:**

- Filters to only existing URLs
- Returns `null` if no URLs exist
- Horizontal row: `flex flex-wrap gap-3` (wraps naturally on mobile)
- Right-aligned on desktop
- **Visual:** Icons only (no visible text labels)
- **Accessibility:** aria-labels for screen readers only

**Icons (lucide-react):**

- Facebook → `Facebook`
- Twitter/X → `Twitter`
- Instagram → `Instagram`
- YouTube → `Youtube`
- Spotify → `Music`

**Icon Styling:**

- Size: `w-6 h-6` or `w-5 h-5`
- Hover: Color transition + slight scale
- **No visible text labels** - icons are self-explanatory
- Accessible: `aria-label` for screen readers (invisible to sighted users)

### ArtistLinksDownloads Component

**Props:** `downloads` object, `locale?: 'de' | 'en'`

**Rendering:**

- Checks if each download is valid Document object (not just ID)
- Returns `null` if no valid downloads
- Vertical list: `flex flex-col gap-2`
- Each item: Icon + label (`gap-2`, `text-sm`)
- Right-aligned on desktop

**Icons (lucide-react):**

- Biography PDF → `FileText`
- Gallery ZIP → `FileArchive`

**Helper Function:**

```typescript
function isDocumentObject(doc: unknown): doc is Document {
  return typeof doc === 'object' && doc !== null && 'url' in doc
}
```

**Labels (translatable):**

- biographyPDF: "Biography PDF"
- galleryZIP: "Photo Gallery"

## Styling

**Consistency with ContactPersons:**

- Same section wrapper styling
- Same text alignment (right on desktop, left mobile)
- Similar spacing and typography scale

**Responsive Behavior:**

- Mobile: All components stack naturally, left-aligned
- Desktop: Right-aligned within `md:w-1/4` sidebar column
- Social icons use `flex-wrap` so they adapt gracefully

**Accessibility:**

- All links have descriptive `aria-label` attributes
- External links include context about new tab
- Focus states with visible outline/ring
- Proper contrast ratios

## Integration

### Artist Detail Page

Add below ContactPersons in the sidebar:

```typescript
{/* Artist Links - Homepage, Social, Downloads */}
<ArtistLinks
  homepageURL={artist.homepageURL}
  socialMedia={{
    facebookURL: artist.facebookURL,
    instagramURL: artist.instagramURL,
    twitterURL: artist.twitterURL,
    youtubeURL: artist.youtubeURL,
    spotifyURL: artist.spotifyURL,
  }}
  downloads={artist.downloads}
  locale={locale}
/>
```

**Layout wrapper:** Same `<div className="md:w-1/4">` as ContactPersons or separate - TBD during implementation.

### Translation Keys

Add to `src/i18n/en.ts` and `src/i18n/de.ts`:

```typescript
artistLinks: {
  homepage: 'Homepage', // Same in both languages
  downloadBiography: 'Biography PDF',
  downloadGallery: 'Photo Gallery',
  ariaLabels: {
    visitHomepage: 'Visit artist homepage',
    facebook: 'Visit Facebook profile',
    instagram: 'Visit Instagram profile',
    twitter: 'Visit Twitter/X profile',
    youtube: 'Visit YouTube channel',
    spotify: 'Listen on Spotify',
  }
}
```

## Data Flow

1. Artist detail page fetches artist via `getArtistBySlug()` (already includes all URL fields)
2. Page extracts relevant fields and passes to `<ArtistLinks />`
3. Main component distributes props to sub-components
4. Each sub-component handles its own conditional rendering

**Type Safety:**

- Import `Artist`, `Document` types from `@/payload-types`
- All URLs validated in CMS schema (component assumes valid or null)
- Helper functions for type guards (Document validation)

## Testing Strategy

**Unit Tests (each sub-component):**

- Renders correctly with all fields populated
- Renders correctly with some fields populated
- Returns null when no data
- URL formatting works correctly
- Document validation works correctly

**Integration Tests:**

- Main component composes sub-components correctly
- Empty state (all null) renders nothing
- Various combinations of data render appropriately

**Accessibility Tests:**

- All links have aria-labels
- Focus states work correctly
- Screen reader announces correctly

**Responsive Tests:**

- Snapshot tests for mobile/desktop layouts
- Social icons wrap correctly on narrow screens

## Edge Cases

1. **All fields empty:** Component returns `null`, no empty section rendered
2. **Invalid Document references:** Type guard filters out ID-only references
3. **Long domain names:** Truncate or wrap gracefully (handle in CSS)
4. **Mix of populated/empty social URLs:** Only show icons that have URLs
5. **Missing translations:** Fallback to English keys

## Dependencies

**New:**

- `lucide-react` icons (already in project)
- Translation keys in next-intl

**Existing:**

- `@/payload-types` for Artist and Document types
- `@/i18n` for translations
- Next.js Link component for navigation
- Tailwind for styling

## Future Enhancements

- Add more social platforms (TikTok, LinkedIn, etc.) as needed
- Support custom download labels from CMS
- Add download count/size metadata display
- Analytics tracking for link clicks

## Success Criteria

- ✅ Component renders in sidebar below ContactPersons
- ✅ Only shows sections with data (no empty states visible)
- ✅ Social icons display horizontally (icons only, no labels), wrap on mobile
- ✅ All links functional and accessible
- ✅ Styling matches ContactPersons for consistency
- ✅ All tests passing
- ✅ Responsive design works on all breakpoints
