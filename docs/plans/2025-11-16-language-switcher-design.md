# Language Switcher Design (Next.js App Router + next-intl, Payload CMS)

**Date:** 2025-11-16 (revised)

## 1. Overview

This design describes a robust, flexible, and idiomatic approach for implementing a language switcher and fully localized URLs in a Next.js App Router project using [next-intl](https://amannn.github.io/next-intl/) for internationalization and Payload CMS for content. Locale is determined by next-intl’s routing configuration and middleware. No React context or global state is used.

## 2. Routing & Directory Structure

- Use a single set of page files for each logical route (e.g., `app/artists/page.tsx`, `app/artists/[slug]/page.tsx`).
- All localized URLs are defined in `src/i18n/routing.ts` using next-intl’s `defineRouting`.
- No need to duplicate folders for each locale.
- next-intl maps localized URLs (e.g., `/kuenstler`, `/en/artists`) to the correct page files.
- No `/de/` prefix for the default locale if `localePrefix: 'as-needed'` is set.

## 3. next-intl Routing Configuration Example

```ts
// src/i18n/routing.ts
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',
  pathnames: {
    '/artists': { de: '/kuenstler', en: '/artists' },
    '/artists/[slug]': { de: '/kuenstler/[slug]', en: '/artists/[slug]' },
    // Add more routes as needed
  }
});
```

## 4. Middleware Setup

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import {routing} from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
```

## 5. Page Usage Example

```tsx
// app/artists/[slug]/page.tsx
import {getLocale} from 'next-intl/server';

export default async function ArtistDetailPage({params}: {params: {slug: string}}) {
  const locale = await getLocale();
  // Fetch and render artist for the current locale
}
```

## 6. Language Switcher Example

```tsx
import {Link, usePathname} from 'next-intl/navigation';

export default function LanguageSwitcher() {
  const pathname = usePathname();
  return (
    <nav>
      <Link href={pathname} locale="de">Deutsch</Link>
      <Link href={pathname} locale="en">English</Link>
    </nav>
  );
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

This design prioritizes flexibility, maintainability, and full alignment with Next.js App Router, next-intl, and Payload CMS best practices.
