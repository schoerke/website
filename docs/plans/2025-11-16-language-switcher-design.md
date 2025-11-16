# Language Switcher Design (Next.js i18n, Payload CMS)

**Date:** 2025-11-16

## 1. Overview

This design describes a robust, minimal, and idiomatic approach for implementing a language switcher in a Next.js App
Router project using Payload CMS for content and the official Payload SEO plugin for SEO metadata. Locale is determined
solely by the URL, leveraging Next.js i18n routing. No React context or global state is used.

## 2. Directory & Routing Structure

- Use a single set of page files for all locales (no duplication under `/en/`).
- Next.js i18n routing (configured in `next.config.mjs`) handles locale prefixes in URLs.
- Example:
  - `/artists/[slug]/page.tsx` handles both `/artists/[slug]` (default, e.g. German) and `/en/artists/[slug]` (English).
- Page components access the current locale via route params or Next.js context.

## 3. Data Fetching & Locale Handling

- For dynamic content (e.g., artist detail):
  - Fetch the document by ID and current locale from Payload CMS.
  - To get the alternate locale’s slug, fetch the same document by ID with the alternate locale.
  - Pass both slugs to the language switcher component.
- For static pages:
  - Use a static mapping of route equivalents between locales.
  - If mapping is missing, link to the homepage of the selected language.

## 4. Language Switcher Component

- Pure link-based: renders links to the equivalent page in the other language.
- Highlights the current language.
- Receives current and alternate slugs as props.
- If alternate translation is missing, links to the homepage and may visually indicate unavailability.
- Uses accessible markup (`<nav aria-label="Language selector">`, `<a aria-current="page">`).
- No client-side fetching or state management.

## 5. Accessibility & SEO

- Ensure keyboard navigation and screen reader compatibility.
- Clearly indicate the current language visually.
- Rely on the official Payload SEO plugin to generate `<link rel="alternate" hreflang="...">` and other SEO metadata.

## 6. Implementation Order

1. Update `next.config.mjs` for i18n (locales, defaultLocale).
2. Restructure page directories: remove duplicated locale directories, use a single set of page files.
3. Update page components to access locale from params/context and fetch content accordingly.
4. Ensure Payload CMS content has translations and unique slugs per locale.
5. Refactor the language switcher as a pure link-based component.
6. For static pages, create a static mapping for route equivalents.
7. Integrate the switcher in navigation/header.
8. Test navigation, fallback, accessibility, and Payload SEO plugin output.
9. Document the implementation for maintainers.

---

### Detailed Implementation Checklist

- [ ] Update `next.config.mjs` for i18n (locales, defaultLocale)
- [ ] Remove duplicated locale directories; use a single set of page files
- [ ] Refactor all page components to access locale from params/context
- [ ] Update data fetching to use locale for Payload CMS queries
- [ ] Audit Payload CMS for translations and unique slugs per locale
- [ ] Confirm Payload API fetches by ID and locale
- [ ] Refactor language switcher as pure link-based component
- [ ] Accept current and alternate locale slugs as props
- [ ] Render links for both languages, highlight current
- [ ] Handle missing translation by linking to homepage and indicating unavailability
- [ ] Use accessible markup in switcher
- [ ] Create static mapping for static page equivalents
- [ ] Update static page components to use mapping
- [ ] Add switcher to main navigation/header
- [ ] Test navigation for dynamic/static pages
- [ ] Test fallback for missing translations
- [ ] Test accessibility (keyboard, screen reader)
- [ ] Verify Payload SEO plugin output
- [ ] Document implementation for maintainers

---

This design prioritizes simplicity, maintainability, and full alignment with Next.js and Payload CMS best practices.
