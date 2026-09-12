import type { PayloadRequest } from 'payload'

interface PublishedDateValidationOptions {
  req?: PayloadRequest
}

/**
 * Single source of truth for DE/EN published-date validation copy. Shared between the server field
 * validator and any client that needs the same wording.
 */
export const publishedDateMessages: Record<'de' | 'en', { future: string; invalid: string }> = {
  de: {
    future: 'Das Datum darf nicht in der Zukunft liegen.',
    invalid: 'Ungültiges Datum.',
  },
  en: {
    future: 'Date cannot be in the future.',
    invalid: 'Invalid date.',
  },
}

function datePartInBerlin(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * True when the value's calendar date (Europe/Berlin) is after `now`'s calendar date.
 * Compares date-parts only, so "today" always passes regardless of time-of-day.
 *
 * @param value - The date to check
 * @param now - Reference instant (defaults to current time)
 * @returns True when the value is a future Berlin calendar day
 *
 * @example
 * isFuturePublishedDate(new Date('2026-09-12T23:00:00.000Z'), new Date('2026-09-12T12:00:00.000Z'))
 * // => true (Berlin says Sept 13 vs Sept 12)
 */
export function isFuturePublishedDate(value: Date, now: Date = new Date()): boolean {
  if (Number.isNaN(value.getTime()) || Number.isNaN(now.getTime())) return false
  return datePartInBerlin(value) > datePartInBerlin(now)
}

/**
 * Field validation for Posts.publishedDate. Allows empty (optional field), rejects
 * invalid values and future Berlin calendar days. Runs on draft AND publish saves.
 * Typed loosely (value: unknown) because Payload sends date values as strings, but the
 * field-level validation type only allows Date | null | undefined.
 *
 * @param value - Payload field value (Date | string | null | undefined)
 * @param options - Payload validation options; only req.locale is read
 * @returns true when valid, localized error string otherwise
 *
 * @example
 * validatePublishedDate('2026-09-12T10:00:00.000Z', { req: { locale: 'de' } })
 */
export const validatePublishedDate: (value: unknown, options: PublishedDateValidationOptions) => true | string = (
  value,
  options
) => {
  if (value === null || value === undefined) return true

  const locale = options.req?.locale === 'de' ? 'de' : 'en'

  // Reject empty string explicitly: a stored '' becomes Invalid Date and Payload's read
  // transform (`new Date('').toISOString()`) throws RangeError on any read of the doc.
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return publishedDateMessages[locale].invalid
  }

  const parsed = value instanceof Date ? value.getTime() : Date.parse(value)
  if (Number.isNaN(parsed)) return publishedDateMessages[locale].invalid

  return isFuturePublishedDate(new Date(parsed)) ? publishedDateMessages[locale].future : true
}
