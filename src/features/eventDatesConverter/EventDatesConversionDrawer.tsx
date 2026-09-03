'use client'

import { Button, Drawer, TextInput, useModal } from '@payloadcms/ui'
import React from 'react'

import type { EventDatesBlockFields } from '@/blocks/EventDates'

import { parseEventDateLine, validateEventUrl } from './parser'
import type { EventDateSource } from './selection'

import './EventDatesConversionDrawer.scss'

interface EventDatesConversionDrawerProps {
  locale?: string
  onCancel: () => void
  onConfirm: (events: EventDatesBlockFields['events']) => void
  slug: string
  sources: EventDateSource[]
}

const messages = {
  de: {
    cancel: 'Abbrechen',
    convert: 'Umwandeln',
    date: 'Datum',
    dateInvalid: 'Datum muss kanonisches UTC-Mittagsformat verwenden',
    event: 'Termin',
    formInvalid: 'Umwandlung erst nach Korrektur aller Fehler moeglich',
    location: 'Ort',
    locationRequired: 'Ort ist erforderlich',
    parseDate: 'Datum muss ein vollstaendiges unterstuetztes Format verwenden',
    parseInvalidCalendar: 'Datum ist kein gueltiger Kalendertag',
    parseRange: 'Datumsbereiche werden nicht unterstuetzt',
    parseRelative: 'Relative Datumsangaben werden nicht unterstuetzt',
    title: 'Termine umwandeln',
    url: 'URL',
    urlCredentials: 'URL muss eine HTTP(S)-URL ohne Zugangsdaten sein',
    urlInvalid: 'Bitte eine gueltige URL eingeben',
    urlScheme: 'URL muss eine gueltige HTTP(S)-URL sein',
  },
  en: {
    cancel: 'Cancel',
    convert: 'Convert',
    date: 'Date',
    dateInvalid: 'Date must use canonical noon UTC format',
    event: 'Event',
    formInvalid: 'Correct all errors before converting',
    location: 'Location',
    locationRequired: 'Location is required',
    parseDate: 'Date must use a supported complete format',
    parseInvalidCalendar: 'Date is not a valid calendar day',
    parseRange: 'Date ranges are not supported',
    parseRelative: 'Relative dates are not supported',
    title: 'Convert Event Dates',
    url: 'URL',
    urlCredentials: 'URL must be an HTTP(S) URL without credentials',
    urlInvalid: 'Please enter a valid URL',
    urlScheme: 'URL must be a valid HTTP(S) URL',
  },
} as const

type MessageKey = keyof (typeof messages)['en']
type Messages = Record<MessageKey, string>

function getMessages(locale: string | undefined): Messages {
  return locale === 'de' ? messages.de : messages.en
}

function localizeError(error: string | undefined, locale: string | undefined): string | undefined {
  if (!error) return undefined
  const key: Record<string, MessageKey> = {
    'Location is required': 'locationRequired',
    'Date is not a valid calendar day': 'parseInvalidCalendar',
    'Date must use a supported complete format': 'parseDate',
    'Date ranges are not supported': 'parseRange',
    'Please enter a valid URL': 'urlInvalid',
    'Relative dates are not supported': 'parseRelative',
    'URL must be a valid HTTP(S) URL': 'urlScheme',
    'URL must be an HTTP(S) URL without credentials': 'urlCredentials',
  }
  return key[error] ? getMessages(locale)[key[error]] : error
}

interface EventRow {
  date: string
  location: string
  parseError?: string
  source: EventDateSource
  url: string
}

interface EventRowErrors {
  date?: string
  location?: string
  parse?: string
  url?: string
}

function isCanonicalDate(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T12:00:00\.000Z$/.exec(value)
  if (!parts) return false
  const [year, month, day] = parts.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function validateRow(row: EventRow, locale: string | undefined): EventRowErrors {
  const message = getMessages(locale)
  return {
    date: isCanonicalDate(row.date.trim()) ? undefined : message.dateInvalid,
    location: row.location.trim() ? undefined : message.locationRequired,
    parse: localizeError(row.parseError, locale),
    url: localizeError(validateEventUrl(row.url).error, locale),
  }
}

function createRows(sources: EventDateSource[]): EventRow[] {
  return sources.map((source) => {
    const parsed = parseEventDateLine(source.text, source.url)
    return {
      date: parsed.date ?? '',
      location: parsed.location ?? '',
      parseError: parsed.error,
      source,
      url: parsed.url ?? source.url ?? '',
    }
  })
}

function renderError(id: string, message: string | undefined): React.ReactNode {
  return message ? (
    <p className="event-dates-conversion-drawer__error" id={id} role="alert">
      {message}
    </p>
  ) : undefined
}

interface EventDatesConversionFormProps {
  close: () => void
  locale?: string
  onCancel: () => void
  onConfirm: (events: EventDatesBlockFields['events']) => void
  sources: EventDateSource[]
}

const EventDatesConversionForm: React.FC<EventDatesConversionFormProps> = ({
  close,
  locale,
  onCancel,
  onConfirm,
  sources,
}) => {
  const [rows, setRows] = React.useState<EventRow[]>(() => createRows(sources))
  const message = getMessages(locale)

  const updateRow = (index: number, field: 'date' | 'location' | 'url', value: string): void => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        return { ...row, [field]: value, parseError: undefined }
      })
    )
  }

  const errors = rows.map((row) => validateRow(row, locale))
  const canConfirm = errors.every((error) => Object.values(error).every((value) => !value))

  const confirm = (): void => {
    if (!canConfirm) return
    close()
    onConfirm(
      rows.map((row) => {
        const url = validateEventUrl(row.url).url
        return { date: row.date.trim(), location: row.location.trim(), ...(url ? { url } : {}) }
      })
    )
  }

  return (
    <div className="event-dates-conversion-drawer">
      {!canConfirm && (
        <p className="event-dates-conversion-drawer__error" role="alert">
          {rows.length} {message.event}
          {': '}
          {message.formInvalid}
        </p>
      )}
      {rows.map((row, index) => {
        const error = errors[index]
        const number = index + 1
        const paths = {
          date: `event-${number}-date`,
          location: `event-${number}-location`,
          url: `event-${number}-url`,
        }
        return (
          <section
            className="event-dates-conversion-drawer__event-card"
            data-testid={`event-card-${number}`}
            key={`${row.source.key}-${row.source.siblingIndex}-${index}`}
          >
            <p className="event-dates-conversion-drawer__event-title">
              {message.event} {number}
            </p>
            <p className="event-dates-conversion-drawer__source">{row.source.text}</p>
            {error.parse && <p className="event-dates-conversion-drawer__error">{error.parse}</p>}
            <div className="event-dates-conversion-drawer__fields" data-testid={`event-fields-${number}`}>
              <div className="event-dates-conversion-drawer__grid" data-testid={`event-grid-${number}`}>
                <TextInput
                  Error={renderError(`${paths.date}-error`, error.date)}
                  aria-describedby={error.date ? `${paths.date}-error` : undefined}
                  label={`${message.date} ${number}`}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, 'date', event.target.value)
                  }
                  path={paths.date}
                  showError={Boolean(error.date)}
                  value={row.date}
                />
                <TextInput
                  Error={renderError(`${paths.location}-error`, error.location)}
                  aria-describedby={error.location ? `${paths.location}-error` : undefined}
                  label={`${message.location} ${number}`}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    updateRow(index, 'location', event.target.value)
                  }
                  path={paths.location}
                  required
                  showError={Boolean(error.location)}
                  value={row.location}
                />
              </div>
              <TextInput
                Error={renderError(`${paths.url}-error`, error.url)}
                aria-describedby={error.url ? `${paths.url}-error` : undefined}
                label={`${message.url} ${number}`}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateRow(index, 'url', event.target.value)}
                path={paths.url}
                showError={Boolean(error.url)}
                value={row.url}
              />
            </div>
          </section>
        )
      })}
      <footer className="event-dates-conversion-drawer__footer" data-testid="event-dates-conversion-footer">
        <Button buttonStyle="secondary" onClick={onCancel} type="button">
          {message.cancel}
        </Button>
        <Button disabled={!canConfirm} onClick={confirm} type="button">
          {message.convert}
        </Button>
      </footer>
    </div>
  )
}

const EventDatesConversionDrawer: React.FC<EventDatesConversionDrawerProps> = ({
  locale,
  onCancel,
  onConfirm,
  slug,
  sources,
}) => {
  const { closeModal, modalState } = useModal()
  const wasOpen = React.useRef(Boolean(modalState[slug]?.isOpen))
  const skipNextCloseCancel = React.useRef(false)

  React.useEffect(() => {
    const isOpen = Boolean(modalState[slug]?.isOpen)
    if (wasOpen.current && !isOpen) {
      if (!skipNextCloseCancel.current) onCancel()
      skipNextCloseCancel.current = false
    }
    wasOpen.current = isOpen
  }, [modalState, onCancel, slug])

  const cancel = (): void => {
    close()
    onCancel()
  }

  const close = (): void => {
    skipNextCloseCancel.current = true
    closeModal(slug)
  }

  return (
    <Drawer slug={slug} title={getMessages(locale).title}>
      <EventDatesConversionForm
        close={close}
        locale={locale}
        onCancel={cancel}
        onConfirm={onConfirm}
        sources={sources}
      />
    </Drawer>
  )
}

export default EventDatesConversionDrawer
