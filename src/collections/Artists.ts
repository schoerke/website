import { INSTRUMENTS } from '@/constants/options'
import { RECORDING_ROLES } from '@/constants/recordingOptions'
import { createSlugHook } from '@/utils/slug'
import { validateURL, validateYouTubeURL } from '@/validators/fields'
import type { TFunction } from '@payloadcms/translations'
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
        label: ({ t }: { t: TFunction }) => t(`custom:instruments:${opt.value}` as Parameters<typeof t>[0]),
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
      relationTo: 'images',
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
              validate: (value: unknown) => {
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
              type: 'array',
              required: false,
              maxRows: 5,
              label: {
                en: 'Repertoire',
                de: 'Repertoire',
              },
              labels: {
                singular: {
                  en: 'Repertoire Section',
                  de: 'Repertoire-Abschnitt',
                },
                plural: {
                  en: 'Repertoire Sections',
                  de: 'Repertoire-Abschnitte',
                },
              },
              admin: {
                description: {
                  en: 'Organize repertoire into sections. Add a section for each category (e.g., Solo, Chamber Music, Orchestral). Max. 5 sections.',
                  de: 'Repertoire in Abschnitte organisieren. Fügen Sie für jede Kategorie einen Abschnitt hinzu (z.B. Solo, Kammermusik, Orchestral). Max. 5 Abschnitte.',
                },
                initCollapsed: true,
                components: {
                  RowLabel: './collections/components/RepertoireRowLabel',
                },
              },
              validate: (value: unknown) => {
                if (Array.isArray(value) && value.length > 5) {
                  return 'You can only add up to 5 repertoire sections.'
                }
                return true
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                  localized: true,
                  label: {
                    en: 'Section Title',
                    de: 'Abschnittstitel',
                  },
                  admin: {
                    description: {
                      en: 'Title for this repertoire section (e.g., "Solo Repertoire", "Chamber Music")',
                      de: 'Titel für diesen Repertoire-Abschnitt (z.B. "Solo-Repertoire", "Kammermusik")',
                    },
                  },
                },
                {
                  name: 'content',
                  type: 'richText',
                  required: true,
                  localized: true,
                  label: {
                    en: 'Content',
                    de: 'Inhalt',
                  },
                  admin: {
                    description: {
                      en: 'List of works in this repertoire section. No images or embedded media allowed.',
                      de: 'Liste der Werke in diesem Repertoire-Abschnitt. Keine Bilder oder eingebetteten Medien erlaubt.',
                    },
                  },
                },
              ],
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
              type: 'array',
              required: false,
              label: {
                en: 'Discography',
                de: 'Diskographie',
              },
              labels: {
                singular: {
                  en: 'Role Section',
                  de: 'Rollenabschnitt',
                },
                plural: {
                  en: 'Role Sections',
                  de: 'Rollenabschnitte',
                },
              },
              admin: {
                description: {
                  en: 'Group recordings by role. Add a role section for each role the artist performs.',
                  de: 'Aufnahmen nach Rolle gruppieren. Fügen Sie für jede Rolle, die der Künstler ausübt, einen Rollenabschnitt hinzu.',
                },
                initCollapsed: true,
                components: {
                  RowLabel: './collections/components/DiscographyRowLabel',
                },
              },
              fields: [
                {
                  name: 'role',
                  type: 'select',
                  required: true,
                  options: RECORDING_ROLES.map((opt) => ({
                    value: opt.value,
                    label: ({ t }: { t: TFunction }) =>
                      t(`custom:recordingRoles:${opt.value}` as Parameters<typeof t>[0]),
                  })),
                  label: {
                    en: 'Role',
                    de: 'Rolle',
                  },
                  admin: {
                    description: {
                      en: 'Select the role for this group of recordings',
                      de: 'Wählen Sie die Rolle für diese Aufnahmengruppe',
                    },
                  },
                },
                {
                  name: 'recordings',
                  type: 'richText',
                  required: true,
                  localized: true,
                  label: {
                    en: 'Recordings',
                    de: 'Aufnahmen',
                  },
                  admin: {
                    description: {
                      en: 'List of recordings for this role. Each paragraph represents one recording. No images or embedded media allowed.',
                      de: 'Liste der Aufnahmen für diese Rolle. Jeder Absatz stellt eine Aufnahme dar. Keine Bilder oder eingebetteten Medien erlaubt.',
                    },
                  },
                },
              ],
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
                  relationTo: 'documents',
                },
                {
                  name: 'galleryZIP',
                  type: 'upload',
                  label: {
                    en: 'Gallery ZIP Download',
                    de: 'Galerie ZIP Download',
                  },
                  relationTo: 'documents',
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
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: './collections/components/YouTubeLinkRowLabel',
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
        {
          label: {
            en: 'Projects',
            de: 'Projekte',
          },
          fields: [
            {
              name: 'projects',
              type: 'relationship',
              relationTo: 'posts',
              hasMany: true,
              maxRows: 10,
              label: {
                en: 'Featured Projects',
                de: 'Vorgestellte Projekte',
              },
              admin: {
                description: {
                  en: "Drag to reorder how projects appear on this artist's page. Projects are automatically added when linked from Posts.",
                  de: 'Ziehen zum Sortieren, wie Projekte auf der Seite dieses Künstlers erscheinen. Projekte werden automatisch hinzugefügt, wenn sie von Beiträgen verknüpft werden.',
                },
              },
              filterOptions: {
                categories: {
                  in: ['projects'],
                },
              },
              validate: (value: unknown) => {
                if (Array.isArray(value) && value.length > 10) {
                  return 'Maximum 10 projects allowed per artist.'
                }
                return true
              },
            },
          ],
        },
      ],
    },
  ],
}
