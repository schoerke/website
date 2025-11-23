import { INSTRUMENTS } from '@/constants/options'
import { createSlugHook } from '@/utils/slug'
import { validateQuote, validateURL, validateYouTubeURL } from '@/validators/fields'
import type { CollectionConfig } from 'payload'

export const Artists: CollectionConfig = {
  slug: 'artists',
  labels: {
    singular: {
      de: 'Kunstler',
      en: 'Artist',
    },
    plural: {
      de: 'Künstler',
      en: 'Artists',
    },
  },
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    group: 'Organization',
  },
  fields: [
    {
      name: 'name',
      required: true,
      type: 'text',
      unique: true,
    },
    {
      name: 'instrument',
      type: 'select',
      required: true,
      hasMany: true,
      options: INSTRUMENTS.map((opt) => ({
        value: opt.value,
        label: ({ t }) => (t as any)(`custom:instruments:${opt.value}`),
      })),
      admin: {
        position: 'sidebar',
        description: {
          en: 'Select instrument(s) associated with this artist',
          de: 'Wählen Sie Instrument(e) aus, die mit diesem Künstler verbunden sind',
        },
      },
    },
    {
      name: 'image',
      relationTo: 'media',
      type: 'upload',
      label: {
        en: 'Featured Image',
        de: 'Vorschaubild',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Used as the primary image for the artist',
          de: 'Wird als primäres Bild für den Künstler verwendet',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      required: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'Auto-generated from artist name',
          de: 'Automatisch aus dem Künstlernamen generiert',
        },
      },
      hooks: {
        beforeValidate: [createSlugHook('name')],
      },
    },

    // Tabs
    {
      type: 'tabs',
      tabs: [
        {
          label: {
            de: 'Allgemein',
            en: 'General',
          },
          fields: [
            {
              name: 'contactPersons',
              label: {
                de: 'Schoerke Kontakte',
                en: 'Schoerke Contacts',
              },
              admin: {
                description: {
                  en: 'Max. 2 contact persons from the employees directory',
                  de: 'Max. 2 Kontaktpersonen aus dem Mitarbeiterverzeichnis',
                },
              },
              type: 'relationship',
              relationTo: 'employees',
              hasMany: true,
              maxRows: 2,
              validate: (value) => {
                if (Array.isArray(value) && value.length > 2) {
                  return 'You can only select up to 2 contact persons.'
                }
                return true
              },
            },
          ],
        },
        {
          label: {
            de: 'Biographie',
            en: 'Biography',
          },
          fields: [
            {
              name: 'quote',
              label: {
                en: 'Featured Quote',
                de: 'Hervorgehobenes Zitat',
              },
              type: 'text',
              required: false,
              localized: true,
              validate: validateQuote,
            },
            {
              name: 'biography',
              type: 'richText',
              required: true,
              localized: true,
              label: {
                de: 'Biographie',
                en: 'Biography',
              },
            },
          ],
        },
        {
          label: {
            en: 'Repertoire',
            de: 'Repertoire',
          },
          fields: [
            {
              name: 'repertoire',
              type: 'richText',
              required: false,
              localized: true,
              label: {
                en: 'Repertoire',
                de: 'Repertoire',
              },
              admin: {
                description: {
                  en: 'Artist repertoire. No images or embedded media allowed.',
                  de: 'Repertoire des Künstlers. Keine Bilder oder eingebetteten Medien erlaubt.',
                },
              },
            },
          ],
        },
        {
          label: {
            en: 'Discography',
            de: 'Diskographie',
          },
          fields: [
            {
              name: 'discography',
              type: 'richText',
              required: false,
              localized: true,
              label: {
                en: 'Discography',
                de: 'Diskographie',
              },
              admin: {
                description: {
                  en: 'Artist discography. No images or embedded media allowed.',
                  de: 'Diskographie des Künstlers. Keine Bilder oder eingebetteten Medien erlaubt.',
                },
              },
            },
          ],
        },
        {
          label: {
            de: 'Medien',
            en: 'Media',
          },
          fields: [
            {
              name: 'downloads',
              type: 'group',
              fields: [
                {
                  name: 'biographyPDF',
                  type: 'upload',
                  label: {
                    en: 'Biography PDF Download',
                    de: 'Biographie PDF Download',
                  },
                  relationTo: 'media',
                },
                {
                  name: 'galleryZIP',
                  type: 'upload',
                  label: {
                    en: 'Gallery ZIP Download',
                    de: 'Galerie ZIP Download',
                  },
                  relationTo: 'media',
                },
              ],
            },
            {
              name: 'youtubeLinks',
              label: 'YouTube Links',
              type: 'array',
              labels: {
                singular: {
                  en: 'YouTube Video',
                  de: 'YouTube-Video',
                },
                plural: {
                  en: 'YouTube Videos',
                  de: 'YouTube-Videos',
                },
              },
              fields: [
                {
                  name: 'label',
                  label: 'Label',
                  type: 'text',
                  required: true,
                  localized: true,
                },
                {
                  name: 'url',
                  label: 'YouTube URL',
                  type: 'text',
                  required: true,
                  admin: {
                    placeholder: 'https://www.youtube.com/watch?v=...',
                  },
                  validate: validateYouTubeURL,
                },
              ],
            },
          ],
        },
        {
          label: 'URLs',
          description: {
            de: 'Externe Links zu Homepage und Social Media Profilen des Künstlers.',
            en: 'External links to the artist’s homepage and social media profiles.',
          },
          fields: [
            {
              name: 'homepageURL',
              label: 'Homepage URL',
              type: 'text',
              validate: validateURL(),
            },
            {
              name: 'externalCalendarURL',
              label: {
                de: 'Externer Kalender URL',
                en: 'External Calendar URL',
              },
              type: 'text',
              validate: validateURL(),
            },
            {
              name: 'facebookURL',
              label: 'Facebook URL',
              type: 'text',
              validate: validateURL({
                allowedDomains: ['facebook.com', 'fb.com'],
                message: 'Please enter a valid Facebook URL',
              }),
            },
            {
              name: 'instagramURL',
              label: 'Instagram URL',
              type: 'text',
              validate: validateURL({
                allowedDomains: ['instagram.com'],
                message: 'Please enter a valid Instagram URL',
              }),
            },
            {
              name: 'twitterURL',
              label: 'Twitter/X URL',
              type: 'text',
              validate: validateURL({
                allowedDomains: ['twitter.com', 'x.com'],
                message: 'Please enter a valid Twitter/X URL',
              }),
            },
            {
              name: 'youtubeURL',
              label: 'YouTube URL',
              type: 'text',
              validate: validateURL({
                allowedDomains: ['youtube.com', 'youtu.be'],
                message: 'Please enter a valid YouTube URL',
              }),
            },
            {
              name: 'spotifyURL',
              label: 'Spotify URL',
              type: 'text',
              validate: validateURL({
                allowedDomains: ['spotify.com', 'open.spotify.com'],
                message: 'Please enter a valid Spotify URL',
              }),
            },
          ],
        },
      ],
    },
  ],
}
