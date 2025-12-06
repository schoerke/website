# Changelog: December 6, 2025

All notable changes implemented on Friday, December 6, 2025.

---

## Features

### Artist Image Slider Enhancements

- **Improve slider UI and UX**
  - Enlarge dot indicators from 8px to 12px for better visibility
  - Increase spacing between dots and from images (gap-3, mt-4)
  - Add smooth slide transitions with Embla physics-based animation (duration: 30)
  - Add hover states to controls (gray-300 on arrows, gray-400 on dots)
  - Add transition-colors for smooth hover animations

- **Implement slider filtering based on artist tabs**
  - Slider now only shows artists not currently displayed in grid
  - Hide slider completely when all artists are shown (no filter selected)
  - Add "Discover More Artists" heading with localized translations (EN/DE)
  - Move filtering logic to ArtistGrid component for better encapsulation

- **Add embla-carousel-autoplay plugin (8.6.0, ~3-4 KB)**
  - Replace custom timer logic with official Autoplay plugin
  - Auto-advance timer properly resets on manual navigation (dots/arrows)
  - Pause on hover for better UX
  - Pause on focus for accessibility

## Fixes

### Artist Image Slider Bug Fixes

- **Fix timer reset bug**
  - Previous implementation caused double-reset (timer reset on every slide change)
  - Now only resets on manual navigation using `autoplayPlugin.reset()`
  - Maintains stable shuffle order using `useState` with lazy initialization

- **Fix image display issues**
  - Change image priority: tablet → original → card → thumbnail
  - Fixes "zoomed in" appearance on mobile for portrait-oriented images
  - Add focal point support (`focalX`, `focalY`) for better image cropping

- **Fix type safety issues in ArtistGrid**
  - Remove all `any` types from artist image handling
  - Add proper `Image` type import from `@/payload-types`
  - Create type-safe helper functions: `isValidUrl()`, `getValidImageUrl()`
  - Update `Artist` type to use `image?: Image | null`

- **Add empty state handling**
  - ImageSlider returns `null` when no images provided
  - Prevents rendering empty slider controls

- **Add image error fallback**
  - Images fallback to `/assets/default-avatar.webp` on load error
  - Prevents broken image icons in production

## Accessibility

### Artist Image Slider

- **Add ARIA attributes**
  - Add `aria-current="true"` to active dot indicator
  - Add `aria-current="false"` to inactive dots
  - Maintain existing `aria-label` on all controls
  - Keep `tabindex="-1"` on linked slides to prevent focus duplication

## Testing

### Artist Image Slider

- **Add comprehensive test coverage**
  - `ImageSlide.spec.tsx`: 19 tests covering rendering, opacity, focal points, error handling, styling
  - `ImageSlider.spec.tsx`: 30 tests covering navigation, auto-advance, layout, accessibility, edge cases
  - Total: 49 tests, all passing, no warnings
  - Fix React `act()` warning in error handler test

## Documentation

- **Update code comments**
  - Fix duration comment to be technically accurate (physics simulation, not milliseconds)
  - Add JSDoc-style comments for helper functions

## Technical Details

### Dependencies Added

- `embla-carousel-autoplay@8.6.0` - Official autoplay plugin for Embla carousel

### Files Modified

- `src/components/ui/ImageSlider.tsx` - Auto-advance, hover states, aria-current, empty check
- `src/components/ui/ImageSlide.tsx` - Focal point support, error fallback
- `src/components/Artist/ArtistGrid.tsx` - Type safety, slider filtering, shuffle stability, image priority
- `src/app/(frontend)/[locale]/artists/page.tsx` - Simplified server component
- `src/i18n/en.ts` - Added `discoverMore` translation
- `src/i18n/de.ts` - Added `discoverMore` translation

### Files Added

- `src/components/ui/ImageSlider.spec.tsx` - Comprehensive slider tests (30 tests)
- `src/components/ui/ImageSlide.spec.tsx` - Comprehensive slide tests (19 tests)

---

## Code Quality Improvements

- Remove `any` types from artist image handling
- Add proper TypeScript type guards
- Memoize all callback functions with `useCallback`
- Add comprehensive test coverage (49 tests)
- Follow React best practices (proper hooks, dependency arrays)
- Improve error handling and resilience
