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
      name: 'contactPersons',
      label: {
        de: 'Schoerke Kontakte',
        en: 'Schoerke Contacts',
      },
      type: 'relationship',
      relationTo: 'employees',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'image',
      relationTo: 'media',
      type: 'upload',
      label: 'Featured Image',
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
            },
            {
              name: 'instrument',
              type: 'select',
              required: true,
              hasMany: true,
              // TODO: Add dynamic options
              options: [
                {
                  value: 'piano',
                  label: {
                    de: 'Klavier',
                    en: 'Piano',
                  },
                },
                {
                  value: 'conductor',
                  label: {
                    de: 'Dirigent',
                    en: 'Conductor',
                  },
                },
                {
                  value: 'violin',
                  label: {
                    de: 'Violine',
                    en: 'Violin',
                  },
                },
              ],
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
                  label: 'Biography PDF Download',
                  relationTo: 'media',
                },
                {
                  name: 'galleryZIP',
                  type: 'upload',
                  label: 'Gallery ZIP Download',
                  relationTo: 'media',
                },
              ],
            },
            {
              name: 'youtube',
              label: 'YouTube Links',
              type: 'group',
              fields: [],
            },
          ],
        },
        {
          label: 'URLs',
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
        {
          label: {
            en: 'Projects',
            de: 'Projekte',
          },
          fields: [],
        },
      ],
    },
  ],
}
