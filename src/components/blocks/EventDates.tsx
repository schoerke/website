'use client'

import { sanitizeUrl } from '@/utils/html'

interface EventDatesProps {
  events: { id?: string; date: string; location: string; url?: string | null }[]
  locale?: 'de' | 'en'
}

/**
 * Formats a Payload day-only date value for the given locale. Uses explicit UTC
 * because Payload's day-only picker stores the picked day as noon UTC (API
 * writes may vary). Without `timeZone` viewers in UTC+13/+14 see the next day,
 * and an SSR(UTC)/client timezone mismatch hydrates the wrong day.
 */
export function formatEventDate(iso: string | null | undefined, locale: 'de' | 'en'): string {
  if (!iso || typeof iso !== 'string') return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const EventDates: React.FC<EventDatesProps> = ({ events, locale = 'de' }) => {
  if (!events || events.length === 0) return null

  return (
    <p>
      {events.map((event, index) => {
        const text = [formatEventDate(event.date, locale), event.location].filter(Boolean).join(' - ')
        const safeUrl = event.url ? sanitizeUrl(event.url) : ''
        const isSafeLink = text && safeUrl && safeUrl !== '#' && !safeUrl.startsWith('//')
        const line = isSafeLink ? (
          <a href={safeUrl} rel="noopener noreferrer" target="_blank">
            {text}
          </a>
        ) : (
          text
        )
        return (
          <span key={event.id ?? index}>
            {index > 0 && <br />}
            {line}
          </span>
        )
      })}
    </p>
  )
}

export default EventDates
