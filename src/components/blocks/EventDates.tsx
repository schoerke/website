'use client'

import { sanitizeUrl } from '@/utils/html'

interface EventDatesProps {
  events: { id?: string; date: string; location: string; url?: string | null }[]
  locale?: 'de' | 'en'
}

/**
 * Formats a Payload day-only date value for the given locale. Uses explicit UTC
 * because Payload stores day-only dates as midnight UTC: without `timeZone`
 * western viewers (and any SSR/client timezone mismatch) see the previous day.
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
        const text = [formatEventDate(event.date, locale), event.location].filter(Boolean).join(', ')
        const safeUrl = event.url ? sanitizeUrl(event.url) : ''
        const line =
          safeUrl && safeUrl !== '#' ? (
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
