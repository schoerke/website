import { INSTRUMENTS } from '@/constants/options'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

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
    slugField({
      name: 'slug',
    }),
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
              name: 'name',
              required: true,
              type: 'text',
              unique: true,
            },

            {
              name: 'contactPersons',
              label: {
                de: 'Schoerke Kontakte',
                en: 'Schoerke Contacts',
              },
              type: 'relationship',
              relationTo: 'employees',
              hasMany: true,
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
                en: 'Highlight Quote',
                de: 'Hervorgehobenes Zitat',
              },
              type: 'text',
              required: false,
              localized: true,
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
                  validate: (value: unknown) => {
                    if (typeof value !== 'string') return 'Please enter a valid YouTube URL'

                    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/
                    return youtubeRegex.test(value) ? true : 'Please enter a valid YouTube URL'
                  },
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
            },
            {
              name: 'externalCalendarURL',
              label: {
                de: 'Externer Kalender URL',
                en: 'External Calendar URL',
              },
              type: 'text',
            },
            {
              name: 'facebookURL',
              label: 'Facebook URL',
              type: 'text',
            },
            {
              name: 'instagramURL',
              label: 'Instagram URL',
              type: 'text',
            },
            {
              name: 'twitterURL',
              label: 'Twitter/X URL',
              type: 'text',
            },
            {
              name: 'youtubeURL',
              label: 'YouTube URL',
              type: 'text',
            },
            {
              name: 'spotifyURL',
              label: 'Spotify URL',
              type: 'text',
            },
          ],
        },
      ],
    },
  ],
}
