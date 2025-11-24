/**
 * Locale Validation Utilities
 *
 * Provides type-safe locale validation and fallback handling.
 */

export type SupportedLocale = 'de' | 'en'

/**
 * Validates and normalizes a locale string to a supported locale.
 * Falls back to 'de' (default) if the provided locale is not supported.
 *
 * @param locale - The locale string to validate
 * @returns A validated SupportedLocale ('de' or 'en')
 *
 * @example
 * validateLocale('en') // returns 'en'
 * validateLocale('fr') // returns 'de' (fallback)
 * validateLocale('') // returns 'de' (fallback)
 */
export function validateLocale(locale: string | undefined): SupportedLocale {
  if (locale === 'de' || locale === 'en') {
    return locale
  }

  if (locale && locale !== 'de' && locale !== 'en') {
    console.warn(`Invalid locale "${locale}" provided. Falling back to default locale "de".`)
  }

  return 'de'
}

/**
 * Type guard to check if a string is a supported locale.
 *
 * @param locale - The string to check
 * @returns True if the locale is supported
 *
 * @example
 * if (isSupportedLocale(userInput)) {
 *   // TypeScript knows userInput is 'de' | 'en'
 * }
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return locale === 'de' || locale === 'en'
}
