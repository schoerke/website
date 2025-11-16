# Language Switcher Design (Next.js App Router + next-intl, Payload CMS)

**Date:** 2025-11-16 (revised)

## 1. Overview

This design describes a robust, flexible, and idiomatic approach for implementing a language switcher and fully
localized URLs in a Next.js App Router project using [next-intl](https://amannn.github.io/next-intl/) for
internationalization and Payload CMS for content. Locale is determined by next-intl’s routing configuration and
middleware. No React context or global state is used.

## 2. Routing & Directory Structure

- Use a single set of page files for each logical route (e.g., `app/artists/page.tsx`, `app/artists/[slug]/page.tsx`).
- All localized URLs are defined in `src/i18n/routing.ts` using next-intl’s `defineRouting`.
- No need to duplicate folders for each locale.
- next-intl maps localized URLs (e.g., `/kuenstler`, `/en/artists`) to the correct page files.
- No `/de/` prefix for the default locale if `localePrefix: 'as-needed'` is set.

## 3. next-intl Routing Configuration Example

```ts
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',
  pathnames: {
    '/artists': { de: '/kuenstler', en: '/artists' },
    '/artists/[slug]': { de: '/kuenstler/[slug]', en: '/artists/[slug]' },
    // Add more routes as needed
  },
})
```

## 4. Middleware Setup

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
```

## 5. Page Usage Example

```tsx
// app/artists/[slug]/page.tsx
import { getLocale } from 'next-intl/server'

export default async function ArtistDetailPage({ params }: { params: { slug: string } }) {
  const locale = await getLocale()
  // Fetch and render artist for the current locale
}
```

## 6. Language Switcher Example

```tsx
import { Link, usePathname } from 'next-intl/navigation'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  return (
    <nav>
      <Link href={pathname} locale="de">
        Deutsch
      </Link>
      <Link href={pathname} locale="en">
        English
      </Link>
    </nav>
  )
}
```

## 7. Implementation Steps

1. Install next-intl: `pnpm add next-intl`
2. Create `src/i18n/routing.ts` with your locales, default locale, and localized pathnames.
3. Add `middleware.ts` at the project root using next-intl’s `createMiddleware` and your routing config.
4. Use a single set of page files for each logical route.
5. Use `getLocale()` from next-intl/server in your page components.
6. Use next-intl’s `Link` and navigation helpers for all internal links and language switchers.
7. Test all localized URLs and navigation.
8. Document the routing config and how to add new localized routes.

---

This design prioritizes flexibility, maintainability, and full alignment with Next.js App Router, next-intl, and Payload
CMS best practices.

## 8. Edge Case Analysis & Findings

### Key Findings
- next-intl enables fully localized URLs (e.g., `/kuenstler` for German, `/en/artists` for English) with a single set of page files and a central routing config.
- Your Payload CMS setup guarantees consistent slugs across locales for dynamic content (artists), so language switching is reliable.
- Payload CMS is configured to serve fallback content if a translation is missing, so users never see a 404 due to missing translations.

### Edge Case Table

| Edge Case                        | Risk/Impact                | Status/Recommendation                |
|-----------------------------------|----------------------------|--------------------------------------|
| Missing translation/slug          | 404 or fallback            | **Handled by Payload fallback**      |
| Locale switch on dynamic page     | Wrong slug or 404          | **Handled by consistent slugs**      |
| Default locale prefix             | SEO/canonical issues       | Handled by next-intl config          |
| Static/dynamic route config       | 404s, broken links         | Handled by next-intl config          |
| Link/navigation handling          | Broken navigation/SEO      | Use next-intl `Link` everywhere      |
| SEO alternate links               | SEO issues                 | Use next-intl/SEO plugin             |
| Middleware matcher                | Broken API/static files    | Use recommended matcher              |
| Locale detection/cookie           | Wrong locale, UX issues    | Handled by next-intl middleware      |
| Adding new locales/routes         | 404s, missing translations | Update config and translations       |
| Payload CMS integration           | Routing/link breakage      | **Handled by your data model**       |

### Recommendations
- Use next-intl’s helpers for navigation and language switching.
- Keep your routing config and translation files up to date as you add new routes or locales.
- Test navigation and fallback behavior periodically to ensure everything works as expected.
- Use the recommended middleware matcher to avoid interfering with API/static files.
- Use next-intl or your SEO plugin to generate correct alternate links for SEO.

---

This section documents the architectural decisions and edge case handling for your internationalized routing and language switcher, ensuring maintainability and robustness as your project evolves.

## 9. Documentation Maintenance

- Update all project documentation (README, onboarding guides, developer docs) to reflect the next-intl-based routing and language switcher setup.
- Clearly document the process for adding new content, pages, or routes:
  - How to update `src/i18n/routing.ts` with new localized pathnames.
  - How to add new page files (single set per logical route).
  - How to add new locales or translations.
  - How to use next-intl’s helpers for navigation and language switching.
  - How to ensure Payload CMS slugs and fallbacks are configured for new content.
- Ensure that all team members and future maintainers understand the workflow for expanding the site’s content and routes in a localized, SEO-friendly way.

---

This step ensures your documentation stays in sync with your architecture, making it easy for anyone to add new content or routes using the next-intl and Payload CMS setup.

## 10. SEO Integration Clarification

- There is no official "next-intl SEO plugin." For SEO best practices, use next-intl’s routing config and helpers to generate `<link rel="alternate" hreflang="...">` tags in your layouts or pages.
- Alternatively, you can use a general SEO plugin (like next-seo) or your CMS’s SEO plugin (e.g., Payload SEO plugin) in combination with next-intl’s routing info.
- Example: Generating alternate links in your layout using next-intl’s routing config:

```tsx
// app/layout.tsx or app/[...]/layout.tsx
import {routing} from '@/i18n/routing';
import {getLocale} from 'next-intl/server';
import {usePathname} from 'next-intl/navigation';

export default async function RootLayout({children}) {
  const locale = await getLocale();
  const pathname = usePathname(); // or your own logic to get the current path

  return (
    <html lang={locale}>
      <head>
        {/* Generate alternate links for all locales */}
        {routing.locales.map((loc) => (
          <link
            key={loc}
            rel="alternate"
            hrefLang={loc}
            href={routing.getLocalizedPathname(pathname, loc)}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- Update your documentation and code to clarify that next-intl provides the tools for SEO integration, but not a dedicated SEO plugin.

---

This clarification ensures your team understands how to handle SEO with next-intl and avoids confusion about plugin availability.
