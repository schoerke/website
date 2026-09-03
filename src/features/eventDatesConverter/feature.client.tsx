'use client'

import { useLocale, useModal } from '@payloadcms/ui'
import { $createBlockNode, createClientFeature, useEditorConfigContext } from '@payloadcms/richtext-lexical/client'
import {
  $getNodeByKey,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  $isRangeSelection,
  type LexicalEditor,
} from '@payloadcms/richtext-lexical/lexical'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import { Calendar, type LucideProps, Wrench } from 'lucide-react'
import React from 'react'

import type { EventDatesBlockFields } from '@/blocks/EventDates'

import EventDatesConversionDrawer from './EventDatesConversionDrawer'
import { validateEventUrl } from './parser'
import {
  createEventDateSnapshot,
  getEventDateSources,
  matchesEventDateSnapshot,
  type EventDateSnapshot,
} from './selection'

const eventDatesConversionDrawerSlug = 'event-dates-conversion'
const OPEN_EVENT_DATES_CONVERSION_COMMAND = createCommand<void>('OPEN_EVENT_DATES_CONVERSION_COMMAND')

const messages = {
  de: {
    conversionLabel: 'In Termine umwandeln',
    selectionChanged: 'Auswahl wurde geaendert',
    selectionComplete: 'Vollstaendige Absatzinhalte auswaehlen',
  },
  en: {
    conversionLabel: 'Convert to Event Dates',
    selectionChanged: 'Selection changed',
    selectionComplete: 'Select complete paragraph contents',
  },
} as const

type Messages = Record<keyof (typeof messages)['en'], string>

function getMessages(locale: string): Messages {
  return locale === 'de' ? messages.de : messages.en
}

function localizeSelectionError(error: string, locale: string): string {
  if (error === 'Select complete paragraph contents') return getMessages(locale).selectionComplete
  if (locale === 'de') {
    if (error === 'Please enter a valid URL') return 'Bitte eine gueltige URL eingeben'
    if (error === 'URL must be a valid HTTP(S) URL') return 'URL muss eine gueltige HTTP(S)-URL sein'
    if (error === 'URL must be an HTTP(S) URL without credentials')
      return 'URL muss eine HTTP(S)-URL ohne Zugangsdaten sein'
  }
  return error
}

function isCanonicalUtcNoon(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T12:00:00\.000Z$/.exec(value)
  if (!parts) return false
  const [year, month, day] = parts.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function validateEvents(events: EventDatesBlockFields['events'], locale: string): string | undefined {
  if (events.length === 0)
    return locale === 'de' ? 'Mindestens ein Termin ist erforderlich' : 'At least one event is required'
  for (const event of events) {
    if (!isCanonicalUtcNoon(event.date.trim()))
      return locale === 'de'
        ? 'Datum muss kanonisches UTC-Mittagsformat verwenden'
        : 'Date must use canonical noon UTC format'
    if (!event.location.trim()) return locale === 'de' ? 'Ort ist erforderlich' : 'Location is required'
    const url = validateEventUrl(event.url)
    if (url.error) return localizeSelectionError(url.error, locale)
  }
  return undefined
}

const EventDatesConversionGroupIcon: React.FC<LucideProps> = (props) => (
  <span className={['icon', props.className].filter(Boolean).join(' ')}>
    <Wrench aria-hidden={true} color="currentColor" focusable={false} size={16} strokeWidth={1.5} />
  </span>
)

const EventDatesConversionItemIcon: React.FC<LucideProps> = (props) => (
  <Calendar
    {...props}
    aria-hidden={true}
    className={['icon', props.className].filter(Boolean).join(' ')}
    color="currentColor"
    focusable={false}
    size={16}
    strokeWidth={1.5}
  />
)

function hasRangeSelection(selection: unknown): boolean {
  return $isRangeSelection(selection) && !selection.isCollapsed()
}

export function replaceEventDateSources(
  editor: LexicalEditor,
  snapshot: EventDateSnapshot,
  schemaPath: string,
  locale: string,
  events: EventDatesBlockFields['events']
): string | undefined {
  const validationError = validateEvents(events, locale)
  if (validationError) return validationError
  let error: string | undefined

  editor.update(() => {
    if (!matchesEventDateSnapshot(snapshot, editor, schemaPath, locale)) {
      error = getMessages(locale).selectionChanged
      return
    }

    const sourceKeys = [...new Set(snapshot.sources.map((source) => source.key))]
    const sourceNodes = sourceKeys.map((key) => $getNodeByKey(key))
    const firstSource = sourceNodes[0]
    if (!firstSource || sourceNodes.some((node) => !node)) {
      error = getMessages(locale).selectionChanged
      return
    }

    firstSource.insertBefore($createBlockNode({ blockName: '', blockType: 'eventDates', events }))
    for (const sourceNode of sourceNodes) sourceNode?.remove()
  })

  return error
}

const EventDatesConversionPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()
  const { fieldProps } = useEditorConfigContext()
  const locale = useLocale()?.code ?? 'en'
  const { openModal } = useModal()
  const [snapshot, setSnapshot] = React.useState<EventDateSnapshot>()
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    return editor.registerCommand(
      OPEN_EVENT_DATES_CONVERSION_COMMAND,
      () => {
        const { nextSnapshot, selectionError } = editor.getEditorState().read(() => {
          const result = getEventDateSources()
          return {
            nextSnapshot:
              'sources' in result ? createEventDateSnapshot(editor, fieldProps.schemaPath, locale) : undefined,
            selectionError: 'error' in result ? result.error : undefined,
          }
        })
        if (selectionError) {
          setError(localizeSelectionError(selectionError, locale))
          return true
        }
        if (!nextSnapshot) return true
        setError(undefined)
        setSnapshot(nextSnapshot)
        openModal(eventDatesConversionDrawerSlug)
        return true
      },
      COMMAND_PRIORITY_EDITOR
    )
  }, [editor, fieldProps.schemaPath, locale, openModal])

  if (!snapshot) return error ? <p role="alert">{error}</p> : null

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <EventDatesConversionDrawer
        locale={locale}
        onCancel={() => setSnapshot(undefined)}
        onConfirm={(events) => {
          const replacementError = replaceEventDateSources(editor, snapshot, fieldProps.schemaPath, locale, events)
          setSnapshot(undefined)
          setError(replacementError)
        }}
        slug={eventDatesConversionDrawerSlug}
        sources={snapshot.sources}
      />
    </>
  )
}

export const EventDatesConversionFeatureClient = createClientFeature({
  plugins: [{ Component: EventDatesConversionPlugin, position: 'normal' }],
  toolbarInline: {
    groups: [
      {
        ChildComponent: EventDatesConversionGroupIcon,
        items: [
          {
            ChildComponent: EventDatesConversionItemIcon,
            isActive: () => false,
            isEnabled: ({ selection }) => hasRangeSelection(selection),
            key: 'eventDatesConversion',
            label: ({ i18n }) => i18n.t('lexical:eventDatesConversion:convert'),
            onSelect: ({ editor }) => editor.dispatchCommand(OPEN_EVENT_DATES_CONVERSION_COMMAND, undefined),
          },
        ],
        key: 'formattingUtilities',
        type: 'dropdown',
      },
    ],
  },
})
