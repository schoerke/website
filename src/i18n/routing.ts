/**
 * next-intl Routing Configuration
 *
 * This file defines the core i18n routing configuration for the application.
 * It specifies available locales, the default locale, and how locale prefixes
 * are handled in URLs (e.g., /de/artists, /en/artists).
 *
 * For pages with different paths per locale (like legal pages), we define
 * pathname mappings to ensure the LocaleSwitcher navigates correctly.
 *
 * @see https://next-intl.dev/docs/routing/configuration
 */
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/artists': '/artists',
    '/artists/[slug]': '/artists/[slug]',
    '/team': '/team',
    '/news': '/news',
    '/news/[slug]': '/news/[slug]',
    '/projects': '/projects',
    '/projects/[slug]': '/projects/[slug]',
    // Pages with different slugs per locale
    '/kontakt': {
      de: '/kontakt',
      en: '/contact',
    },
    '/impressum': {
      de: '/impressum',
      en: '/imprint',
    },
    '/datenschutz': {
      de: '/datenschutz',
      en: '/privacy-policy',
    },
  },
})
