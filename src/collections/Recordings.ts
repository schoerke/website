import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'
import { RECORDING_ROLES } from '@/constants/recordingOptions'

export const Recordings: CollectionConfig = {
  slug: 'recordings',
  labels: {
    singular: {
      de: 'Aufnahme',
      en: 'Recording',
    },
    plural: {
      de: 'Aufnahmen',
      en: 'Recordings',
    },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content Management',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: {
        de: 'Titel',
        en: 'Title',
      },
      admin: {
        description: {
          en: 'Full title including composer and work (e.g., "Beethoven - Violin Concerto")',
          de: 'Vollständiger Titel einschließlich Komponist und Werk (z.B. "Beethoven - Violinkonzert")',
        },
      },
    },
    {
      name: 'description',
      type: 'richText',
      required: false,
      localized: true,
      label: {
        de: 'Beschreibung',
        en: 'Description',
      },
      admin: {
        description: {
          en: 'General information about the recording (composers, track listings, work details, program notes). No images or embedded media allowed.',
          de: 'Allgemeine Informationen zur Aufnahme (Komponisten, Trackliste, Werkdetails, Programmnotizen). Keine Bilder oder eingebetteten Medien erlaubt.',
        },
      },
    },
    {
      name: 'recordingYear',
      type: 'number',
      required: false,
      label: {
        de: 'Aufnahmejahr',
        en: 'Recording Year',
      },
      admin: {
        description: {
          en: 'Year of recording (not release year)',
          de: 'Aufnahmejahr (nicht Veröffentlichungsjahr)',
        },
        position: 'sidebar',
      },
      validate: (value: number | undefined | null) => {
        if (value !== undefined && value !== null) {
          const currentYear = new Date().getFullYear()
          if (value < 1900 || value > currentYear + 1) {
            return `Year must be between 1900 and ${currentYear + 1}`
          }
        }
        return true
      },
    },
    {
      name: 'recordingLabel',
      type: 'text',
      required: false,
      label: {
        de: 'Label',
        en: 'Recording Label',
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'catalogNumber',
      type: 'text',
      required: false,
      label: {
        de: 'Katalognummer',
        en: 'Catalog Number',
      },
      admin: {
        placeholder: {
          en: 'e.g., DG 479 5382',
          de: 'z.B. DG 479 5382',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'coverArt',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: {
        de: 'Cover',
        en: 'Cover Art',
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'artistRoles',
      type: 'array',
      required: true,
      minRows: 1,
      label: {
        de: 'Künstler & Rollen',
        en: 'Artists & Roles',
      },
      labels: {
        singular: {
          de: 'Künstler',
          en: 'Artist',
        },
        plural: {
          de: 'Künstler',
          en: 'Artists',
        },
      },
      fields: [
        {
          name: 'artist',
          type: 'relationship',
          relationTo: 'artists',
          required: true,
          label: {
            de: 'Künstler',
            en: 'Artist',
          },
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          hasMany: true,
          label: {
            de: 'Rolle(n)',
            en: 'Role(s)',
          },
          options: RECORDING_ROLES.map((opt) => ({
            value: opt.value,
            label: ({ t }) => (t as any)(`custom:recordingRoles:${opt.value}`),
          })),
          admin: {
            description: {
              en: 'Select one or more roles for this artist',
              de: 'Wählen Sie eine oder mehrere Rollen für diesen Künstler',
            },
          },
        },
      ],
    },
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
    },
    maxPerDoc: 5,
  },
}
