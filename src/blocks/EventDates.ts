import type { Block } from 'payload'

import { validateURL } from '@/validators/fields'

/**
 * Event Dates Block Field Types
 *
 * Block fields live inside richText JSON and are not part of generated
 * payload-types — this interface is the sole typing source for the converter.
 */
export interface EventDatesBlockFields {
  events: { id?: string; date: string; location: string; url?: string }[]
}

/**
 * Server-side guard for the events array. Payload's `minRows` is UI-only and
 * is not enforced by the API, so an explicit validate rejects empty arrays.
 */
export const validateEventDates = (value: unknown): true | string => {
  if (!Array.isArray(value) || value.length === 0) {
    return 'At least one event is required'
  }
  return true
}

/**
 * Event Dates Block
 *
 * Lists concert dates (date, location, optional url) inside post content.
 * Renders like post 242's manual "4. Juli 2026, Yamagata" linked lines.
 */
export const EventDates: Block = {
  slug: 'eventDates',
  labels: {
    singular: { en: 'Event Dates', de: 'Termin' },
    plural: { en: 'Event Dates', de: 'Termine' },
  },
  admin: {
    // Same upstream focus-stealing bug as the other blocks; blockName unused.
    disableBlockName: true,
  },
  fields: [
    {
      name: 'events',
      type: 'array',
      required: true,
      minRows: 1,
      // Seed one empty row so a freshly inserted block doesn't demand manual
      // row creation (or surface the "at least one event" validation error).
      defaultValue: [{}],
      validate: validateEventDates,
      labels: {
        singular: { en: 'Event', de: 'Veranstaltung' },
        plural: { en: 'Events', de: 'Veranstaltungen' },
      },
      admin: {
        components: {
          RowLabel: './blocks/components/EventDateRowLabel',
        },
      },
      fields: [
        {
          name: 'date',
          type: 'date',
          required: true,
          label: { en: 'Date', de: 'Datum' },
          admin: {
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'location',
          type: 'text',
          required: true,
          label: { en: 'Location', de: 'Ort' },
        },
        {
          name: 'url',
          type: 'text',
          required: false,
          label: { en: 'URL', de: 'URL' },
          validate: validateURL(),
        },
      ],
    },
  ],
}
