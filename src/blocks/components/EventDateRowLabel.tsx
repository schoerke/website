'use client'

import { useLocale, useRowLabel } from '@payloadcms/ui'

import { formatEventDate } from '@/components/blocks/EventDates'

type EventDateRow = {
  date?: string
  location?: string
}

function fallbackLabel(locale: 'de' | 'en', rowNumber?: number): string {
  const label = locale === 'de' ? 'Veranstaltung' : 'Event'
  return `${label} ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
}

const EventDateRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<EventDateRow>()
  const locale = useLocale()?.code === 'en' ? 'en' : 'de'
  const date = formatEventDate(data?.date, locale)
  const location = data?.location?.trim() ?? ''
  const label = [date, location].filter(Boolean).join(' - ')

  return <div>{label || fallbackLabel(locale, rowNumber)}</div>
}

export default EventDateRowLabel
