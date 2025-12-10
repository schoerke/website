# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added - December 10, 2025

#### Code Quality

- **Complete TypeScript/ESLint cleanup** - Eliminated all `any` types across entire codebase
  - Fixed 78 problems (67 errors, 11 warnings) → 0 problems
  - Production code: Replaced `any` with proper Payload types and type guards
  - Scripts: Replaced `any` with `unknown`, `as never`, or specific types
  - Test files: Replaced `any` with `as never` for mock types
  - Added proper type imports: `SerializedEditorState`, `FieldHook`, `Payload` types
  - All 203 tests passing, build passing
  - Result: 100% TypeScript type safety throughout codebase

---

## [0.2.0] - December 6, 2025

### Added

#### Artist Image Slider Enhancements

- **Improved slider UI and UX**
  - Enlarged dot indicators from 8px to 12px for better visibility
  - Increased spacing between dots and from images
  - Added smooth slide transitions with Embla physics-based animation
  - Added hover states to controls (arrows and dots)
  - Added transition-colors for smooth hover animations

- **Slider filtering based on artist tabs**
  - Slider now only shows artists not currently displayed in grid
  - Hides slider completely when all artists are shown (no filter selected)
  - Added "Discover More Artists" heading with localized translations (EN/DE)
  - Moved filtering logic to ArtistGrid component for better encapsulation

- **Embla-carousel-autoplay plugin** (8.6.0)
  - Replaced custom timer logic with official Autoplay plugin
  - Auto-advance timer properly resets on manual navigation
  - Pause on hover and focus for better UX and accessibility

#### Accessibility

- **ARIA attributes for slider**
  - Added `aria-current="true"` to active dot indicator
  - Added `aria-current="false"` to inactive dots
  - Maintained existing `aria-label` on all controls

#### Testing

- **Comprehensive test coverage for image slider**
  - `ImageSlide.spec.tsx`: 19 tests covering rendering, opacity, focal points, error handling
  - `ImageSlider.spec.tsx`: 30 tests covering navigation, auto-advance, accessibility, edge cases
  - Total: 49 new tests, all passing

### Fixed

#### Artist Image Slider Bug Fixes

- **Timer reset bug** - Now only resets on manual navigation, not every slide change
- **Image display issues** - Changed image priority: tablet → original → card → thumbnail
- **Type safety** - Removed all `any` types from artist image handling, added proper type guards
- **Empty state** - ImageSlider returns `null` when no images provided
- **Image errors** - Images fallback to `/assets/default-avatar.webp` on load error

---

## [0.1.0] - November 20-29, 2025

### Added

#### Search & Discovery

- **Project-wide search implementation** (Phase 1 & 2)
  - Payload Search Plugin with localization support
  - KBar command palette with brand styling and locale-aware routing
  - Search API endpoint with locale filtering and pagination
  - beforeSync hook with text extraction, stopword filtering, relationship denormalization
  - German and English stopword lists
  - Static JSON backup with client-side fallback
  - Complete artist/employee data with proper display titles
  - Reindex script for search schema updates

#### Pages Collection & Static Content

- **Pages collection for CMS-managed static content**
  - Localized title, slug, and rich text content
  - Service layer for page retrieval
  - Dedicated routes for legal pages (impressum/imprint, datenschutz/privacy-policy)
  - Contact page and team page using Pages collection
  - Pathname mappings for localized URLs
  - Search plugin integration (priority: 25)

#### Repertoire Management

- **Repertoire collection with WordPress migration**
  - Separate collection with localized fields (title, description)
  - Relationship to Artists collection
  - Admin UI with custom row labels showing title + artist count
  - WordPress migration script with Lexical conversion
  - 32 repertoire entries migrated (16 EN + 16 DE)
  - Repertoire tab on artist pages

#### Recordings & Discography

- **Complete Recordings collection**
  - Backend with localized fields
  - Service layer with comprehensive tests
  - WordPress discography migration with intelligent parsing
  - Integration into artist detail page discography tab
  - Role filter (Conductor, Soloist, Chamber Music, etc.)
  - 'All' filter option with left-aligned toggle group
  - List view with full-width layout
  - No 10-item limit for complete data display

- **Enhanced migration intelligence**
  - H1 heading-based role detection (replaced content-based detection)
  - Idempotent migration to prevent duplicates
  - Enhanced richText parsing for complex WordPress content
  - Recording year extraction from label/catalog line
  - Real-world label/catalog format handling
  - Separate DE and EN locale processing
  - Removed 'Partner: ' prefix from descriptions
  - Merged composer field into title

- **Discography structure refactor**
  - Role-based array format with separate recordings fields
  - Separated artists and roles fields for independent filtering
  - Custom row labels for discography sections and YouTube videos
  - Repertoire section toggle UI

#### Artist Pages & UI

- **Artist tabs interface**
  - Artist detail page tabs with lazy-loaded content (Biography, Recordings, Repertoire)
  - Highlight quote moved into Biography tab
  - Brand styling and smooth transitions
  - UI components and i18n foundation
  - Improved header alignment

- **Enhanced artist list and discovery**
  - Improved layout and sorting
  - Image slider below artist grid
  - "Discover More Artists" section with multi-item slider (2 artists per slide)
  - Instrument-based sorting (conductor, piano, violin, etc.) with alphabetical ordering
  - Standardized 4:3 aspect ratio images
  - Fade animations and refined text hierarchy

#### NewsFeed & Posts

- **Complete NewsFeed component system**
  - NewsFeed components with comprehensive tests
  - Post detail pages with static generation
  - Post filtering service with tests
  - Integration across application
  - Slug field with improved localization strategy
  - Explicit artist relationships
  - Posts seeding script

#### WordPress Migration Infrastructure

- **Comprehensive migration tooling**
  - WordPress to Payload CMS migration infrastructure
  - WordPress XML exports and migration mapping files
  - Employee migration with proper data structure
  - Artist migration with biography conversion
  - HTML to Lexical converter preserving newlines and paragraph structure
  - Lexical format normalization for older dump formats
  - Local media URLs for image display

#### Mobile Experience

- **iOS Safe Area Support**
  - `.pb-safe` Tailwind utility class
  - Mobile-only safe-area padding to footer (respects iOS home bar)
  - Responsive override for larger screens
  - Prevents content hiding under iOS home bar

### Fixed

#### Type Safety & Error Handling

- Error handling in page service functions (try-catch with logging)
- Proper TypeScript types (SerializedEditorState) for PayloadRichText
- Locale validation utilities

#### Routing & Localization

- Dynamic routes in LocaleSwitcher (fixed 'Insufficient params provided' error)
- next-intl router in SearchProvider for proper locale handling
- setRequestLocale and locale extraction to all Pages routes
- impressum/datenschutz routes language content
- URL hash fragment preservation during locale switching
- Header component locale type annotation

#### Data Integrity

- Newlines preserved in HTML to Lexical converter
- Employee search indexing name extraction
- All localized field data in collection dumps
- Empty migration entries prevented with improved filtering
- H2 heading support in discography migration script
- Proper Lexical editor metadata in migration script
- Claire Huangci featured quote validation error
- 64 media records with broken `/null` URLs regenerated
- Migration script null filename handling

#### UI & Display

- Role filter shown even with single role
- Logo in footer
- Spacing and alignment in recording cards

#### R2 Storage

- Database: 64 media records with broken `/null` URLs regenerated
- Migration script: Null filename handling
- Production images: All artist images now load from R2
- Admin thumbnails: Known issue, public site unaffected

### Refactoring

#### Code Organization

- Consolidated page routes with shared StaticPageLayout component
- Extracted test mock factories
- Removed payload parameter from service functions (initialize internally)
- Colocated test files with modules (.spec.ts convention)
- Organized scripts into logical folders (db/, utils/, wordpress/)
- Established tmp/ folder structure

#### Architecture Improvements

- Refactored discography to role-based array format
- Reusable media service with asset helpers
- Images saved as webp format
- Renamed util components for clarity

#### Component Improvements

- Updated Payload configuration for migration workflow
- Simplified database configuration (remote Turso only)
- Fixed recording service tests with correct limit parameter
- Removed pagination limits for complete data display

### Documentation

#### Architecture Decision Records (ADR)

- Database backup strategy
- next-intl adoption (archived)
- Vercel deployment strategy (archived)
- Vercel Blob storage migration (archived)

#### Implementation Plans

- Project-wide search detailed implementation
- Refined project-wide search design
- Recording collection implementation
- Repertoire collection architecture
- Footer refactoring design
- NewsFeed implementation
- Archived completed plans (artist list, YouTube links, tabs, repertoire, etc.)

#### Agent Guidelines

- **Database protection policy** (critical)
  - Never modify databases without explicit user confirmation
  - Always verify database environment first (local vs remote)
  - Document incident log for accountability
- WordPress migration data integrity guidelines
- Payload CMS search plugin localization guidance
- Environment variable management policy
- Git commit policy
- Library installation policy
- Script management policy (temporary vs permanent)
- React component pattern enforcement

#### API & Usage Documentation

- Comprehensive JSDoc comments to all service functions
- Comprehensive JSDoc to database scripts
- Comprehensive JSDoc to remaining scripts
- Improved Pages collection documentation with examples
- Contact page setup instructions

### Testing

- Comprehensive testing infrastructure with Vitest
- Test infrastructure for next-intl components
- Comprehensive unit tests for Footer components
- Test coverage for all service layers: artist, employee, media, post, recording
- **Total: 203 passing tests**

### Chore

#### Data Management

- Updated collection dumps throughout period
- Pages collection dump
- Dumps after migrations
- Cleaned up duplicate repertoire entries

#### Dependencies & Configuration

- Updated node version
- Added dependabot overrides
- Updated importmap for admin panel
- Tailwind typography plugin support for Tailwind CSS v4
- mise.toml for tool version management
- embla-carousel-autoplay@8.6.0
- baseline-browser-mapping updated to 2.8.32

#### Code Cleanup

- Removed temporary debug and utility scripts
- Removed obsolete populateArtistSlugs migration script
- Removed deprecated WordPress XML exports
- Removed employee seed script and JSON data (migrated from WordPress)
- Updated seed scripts to remove employee seeding
- Don't render utility components in production

#### Formatting & Style

- Applied prettier formatting to database dumps and tmp README
- Formatted tmp/README.md tables and spacing
- Added trailing newlines to WordPress data files
- Updated gitignore for WordPress migration temporary files

### Statistics

- **Total commits**: 145+ (November 20-29)
- **Test coverage**: 203 passing tests
- **Data migrated**:
  - 23 artists with biographies
  - 32 repertoire entries (16 EN + 16 DE)
  - All employee records
  - Complete discography data
  - Media library with alt text

---

## Key Learnings

### TypeScript & Type Safety

1. **Payload types are the source of truth** - Never create custom types that duplicate Payload types
2. **`depth` parameter is critical** - Without it, relationships are IDs, not populated objects
3. **Type guards are necessary** - Payload relationships can be `number | Type | null`
4. **Use official library types** - Import `FieldHook` from Payload, `SerializedEditorState` from Lexical, etc.
5. **`Parameters<typeof fn>[0]`** - Clean way to extract parameter types for type-safe assertions

### React Patterns

6. **Key prop pattern > setState in useEffect** - React's recommended pattern for state reset
7. **useSyncExternalStore server snapshot must be cached** - Return same object reference to avoid infinite loops
8. **Refs must not be accessed during render** - Use callback refs instead
9. **setState in useEffect must be async** - Wrap synchronous setState calls in setTimeout

### Migration & Data Integrity

10. **Always verify database environment** - Check `.env` before any database operation
11. **Upload media before running migrations** - Foreign key constraints require referenced records to exist
12. **WordPress timestamp postfixes** - Clean filename postfixes (`-e[timestamp]`) to avoid database clutter
13. **Preserve original data** - Don't assume values are "wrong" during migrations without explicit instruction

---

_This changelog consolidates all changes from November 2025 through December 2025._
