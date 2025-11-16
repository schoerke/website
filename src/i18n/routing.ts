/**
 * next-intl Routing Configuration
 *
 * This file defines the core i18n routing configuration for the application.
 * It specifies available locales, the default locale, and how locale prefixes
 * are handled in URLs (e.g., /de/artists, /en/artists).
 *
 * @see https://next-intl.dev/docs/routing/configuration
 */
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'always',
})
