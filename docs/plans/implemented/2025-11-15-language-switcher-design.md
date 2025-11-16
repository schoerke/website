# Language Switcher Design Plan (Payload CMS + Next.js)

**Date:** 2025-11-15

## 1. Architecture & Data Flow

- Use Next.js i18n routing: default locale (German) has no prefix, English uses /en/.
- All localized content and UI strings are fetched from Payload CMS using the `locale` parameter.
- Minimal wrapper `page.tsx` files per locale route, all logic/UI in shared components.

## 2. Components & Directory Structure

- Wrapper `page.tsx` files for each locale/route (e.g., /artists, /en/artists), located in src/app/(frontend)/.
- Shared React components (e.g., ArtistListPage, ArtistDetailPage) in src/components/, receive `locale` and other
  params.
- Language switcher component in main navigation/header, displays EN / DE.

**Example:**

```
src/app/(frontend)/
  artists/
    [slug]/page.tsx      // German artist detail
    page.tsx             // German artist list
  en/
    artists/
      [slug]/page.tsx    // English artist detail
      page.tsx           // English artist list
```

Each wrapper imports and renders the shared component, passing the correct locale.

## 3. Language Switcher Logic

- Detect current locale and route context using Next.js router or params.
- For dynamic content:
  - Fetch current document by slug and locale from Payload.
  - Use document ID to fetch the other locale’s version and slug.
  - Build the target URL for the other language.
- For static pages:
  - Use a small static mapping for base paths if not managed in Payload.
- If translation is missing, link to the homepage of the selected language.

## 4. Error Handling & Edge Cases

- Fallback to homepage if translation is missing.
- Set `fallbackLocale: false` in Payload queries to avoid showing content in the wrong language.
- Ensure unique slugs per locale in Payload.
- Use accessible markup and highlight the current language in the switcher.
- Add SEO <link rel="alternate" hreflang="..."> tags for each locale.

## 5. Next Steps

- Implement shared components for list/detail pages in src/components/.
- Implement the language switcher component with dynamic slug resolution.
- Update wrapper page.tsx files to use shared components and pass locale.
- Add static mapping for static pages if needed.
- Test navigation, fallback, and SEO tags.
