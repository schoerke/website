/**
 * next-intl Request Configuration
 *
 * This file configures how next-intl handles incoming requests and loads
 * the appropriate translation messages for each locale. It validates the
 * requested locale and dynamically imports the corresponding translation file.
 *
 * This configuration is automatically used by next-intl in both server and
 * client components to provide the correct translations based on the URL.
 *
 * @see https://next-intl.dev/docs/usage/configuration
 */
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`./${locale}.ts`)).default,
  }
})
