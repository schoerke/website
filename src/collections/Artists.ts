import { INSTRUMENTS } from '@/constants/options'
import { enforceRepertoireOrderOnly } from '@/collections/hooks/enforceRepertoireOrderOnly'
import { revalidateArtistOnChange, revalidateArtistOnDelete } from '@/collections/hooks/revalidateArtist'
import { createSlugHook } from '@/utils/slug'
import { validateURL, validateVideoURL } from '@/validators/fields'
import { validateVideoEmbedCode } from '@/validators/videoFields'
import { PerformersList } from '@/blocks/PerformersList'
import { ArtistBiographyWarningFeature } from '@/features/artistBiographyWarning/feature.server'
import { PerformersListConversionFeature } from '@/features/performersListConverter/feature.server'
import { artistBiographyMessages, validateArtistBiography } from '@/validators/artistBiography'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { TFunction } from '@payloadcms/translations'
import type { CollectionConfig } from 'payload'
import { richText } from 'payload/shared'
import type { RichTextFieldValidation } from 'payload/shared'

interface LexicalEditorState {
  root: {
    children: unknown[]
  }
}

interface ValidatingRichTextEditor {
  validate: (
    value: object | null | undefined,
    options: Parameters<RichTextFieldValidation>[1]
  ) => Promise<string | true> | string | true
}

function hasRootChildren(value: unknown): value is LexicalEditorState {
  if (typeof value !== 'object' || value === null || !('root' in value)) return false
  const { root } = value
  return typeof root === 'object' && root !== null && 'children' in root && Array.isArray(root.children)
}

function isCanonicalEmptyRichText(value: unknown): boolean {
  if (!hasRootChildren(value) || value.root.children.length !== 1) return false

  const [firstChild] = value.root.children
  if (
    typeof firstChild !== 'object' ||
    firstChild === null ||
    !('type' in firstChild) ||
    firstChild.type !== 'paragraph' ||
    !('children' in firstChild) ||
    !Array.isArray(firstChild.children)
  ) {
    return false
  }

  return firstChild.children.every(
    (paragraphChild) =>
      typeof paragraphChild === 'object' &&
      paragraphChild !== null &&
      'type' in paragraphChild &&
      paragraphChild.type === 'text' &&
      'text' in paragraphChild &&
      typeof paragraphChild.text === 'string' &&
      paragraphChild.text.length === 0
  )
}

function hasEditorValidator(editor: unknown): editor is ValidatingRichTextEditor {
  return typeof editor === 'object' && editor !== null && 'validate' in editor && typeof editor.validate === 'function'
}

export const validatePublishedArtistBiography: RichTextFieldValidation = async (value, options) => {
  const locale = options.req?.locale === 'de' ? 'de' : 'en'
  const messages = artistBiographyMessages[locale]

  if (
    value === null ||
    value === undefined ||
    // Defensive: Payload types the value as object, but some API clients/restore payloads send ''
    (value as unknown) === '' ||
    (hasRootChildren(value) && value.root.children.length === 0) ||
    isCanonicalEmptyRichText(value)
  ) {
    return await richText(value, options)
  }

  const structureResult = validateArtistBiography(value)
  if (structureResult === 'malformed') return messages.malformed

  if (!hasEditorValidator(options.editor)) {
    console.error('validatePublishedArtistBiography: options.editor has no validate function', options.editor)
    return messages.malformed
  }
  const lexicalResult = await options.editor.validate(value, options)
  if (lexicalResult !== true) return lexicalResult

  return structureResult === true ? true : messages[structureResult]
}

export const Artists: CollectionConfig = {
  slug: 'artists',
  labels: {
    singular: {
      de: 'Künstler:in',
      en: 'Artist',
    },
    plural: {
      de: 'Künstler:innen',
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
              admin: {
                components: {
                  Field: '/components/admin/QuoteField',
                },
              },
            },
            {
              name: 'quoteSource',
              type: 'text',
              localized: true,
              required: false,
              label: {
                de: 'Zitatquelle',
                en: 'Quote source',
              },
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
              admin: {
                description: {
                  en: 'Artist biography. No images or embedded media allowed. A Performers List block may be inserted.',
                  de: 'Biographie des Künstlers. Keine Bilder oder eingebetteten Medien erlaubt. Ein Künstlerlisten-Block kann eingefügt werden.',
                },
              },
              editor: lexicalEditor({
                features: ({ defaultFeatures }) => [
                  // Artist biography bans media (see admin description): strip the upload and
                  // relationship insert features so the toolbar can't add images/media.
                  ...defaultFeatures.filter((feature) => feature.key !== 'upload' && feature.key !== 'relationship'),
                  BlocksFeature({
                    blocks: [PerformersList],
                  }),
                  PerformersListConversionFeature(),
                  ArtistBiographyWarningFeature(),
                ],
              }),
              validate: validatePublishedArtistBiography,
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
              type: 'relationship',
              relationTo: 'repertoire',
              hasMany: true,
              maxRows: 5,
              label: {
                en: 'Repertoire',
                de: 'Repertoire',
              },
              admin: {
                description: {
                  en: "Repertoire lists shown on this artist's page. Drag to reorder. Maximum 5 lists.",
                  de: 'Repertoire-Listen auf der Seite dieses Künstlers. Ziehen zum Sortieren. Maximal 5 Listen.',
                },
              },
              validate: (value: unknown) => {
                if (Array.isArray(value) && value.length > 5) {
                  return 'Maximum 5 repertoire lists per artist. Please remove some before adding more.'
                }
                return true
              },
              filterOptions: ({ id }) =>
                ({
                  and: [{ artists: { contains: id } }],
                }) as const,
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
                  en: 'Projects are automatically added when linked from Posts. Drag to reorder. Maximum 10 projects per artist.',
                  de: 'Projekte werden automatisch hinzugefügt, wenn sie von Beiträgen verknüpft werden. Ziehen zum Sortieren. Maximal 10 Projekte pro Künstler.',
                },
                allowCreate: false,
              },
              validate: (value: unknown) => {
                if (Array.isArray(value) && value.length > 10) {
                  return 'Maximum 10 projects allowed per artist. Please remove some before adding more.'
                }
                return true
              },
              filterOptions: ({ id }) =>
                ({
                  and: [{ categories: { contains: 'projects' } }, { artists: { contains: id } }],
                }) as const,
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
                  name: 'biographyPdf',
                  type: 'upload',
                  localized: true,
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
              name: 'videoLinks',
              label: {
                en: 'Video Links',
                de: 'Video-Links',
              },
              type: 'array',
              labels: {
                singular: {
                  en: 'Video',
                  de: 'Video',
                },
                plural: {
                  en: 'Videos',
                  de: 'Videos',
                },
              },
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: './collections/components/VideoLinkRowLabel',
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
                  label: 'Video URL',
                  type: 'text',
                  required: false,
                  admin: {
                    placeholder: 'arte.tv/de/videos/...',
                    description: 'Supports YouTube and arte.tv URLs (leave empty when using an embed code)',
                    condition: (_, siblingData) => !siblingData?.embedCode,
                  },
                  validate: validateVideoURL,
                },
                {
                  name: 'embedCode',
                  label: { en: 'Embed Code', de: 'Einbettungscode' },
                  type: 'textarea',
                  required: false,
                  admin: {
                    placeholder:
                      '<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761" width="392" height="220" allowfullscreen></iframe>',
                    description: {
                      en: 'Paste an <iframe> embed code from a supported provider (e.g. RSI, ARD Mediathek, RTS). Leave empty when using a URL.',
                      de: '<iframe>-Einbettungscode eines unterstützten Anbieters einfügen (z. B. RSI, ARD Mediathek, RTS). Bei Verwendung einer URL leer lassen.',
                    },
                    condition: (_, siblingData) => !siblingData?.url,
                    rows: 4,
                  },
                  validate: validateVideoEmbedCode,
                },
              ],
            },
            {
              name: 'galleryImages',
              label: {
                en: 'Gallery Images',
                de: 'Galeriebilder',
              },
              type: 'array',
              maxRows: 20,
              labels: {
                singular: { en: 'Image', de: 'Bild' },
                plural: { en: 'Images', de: 'Bilder' },
              },
              admin: {
                initCollapsed: true,
                description: {
                  en: 'Press photos displayed in the gallery on the artist detail page. Maximum 20 images.',
                  de: 'Pressefotos, die in der Galerie auf der Künstlerdetailseite angezeigt werden. Maximal 20 Bilder.',
                },
                components: {
                  RowLabel: './collections/components/GalleryImageRowLabel',
                },
              },
              validate: (value: unknown) => {
                if (Array.isArray(value) && value.length > 20) {
                  return 'Maximum 20 gallery images allowed per artist. Please remove some before adding more.'
                }
                return true
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'images',
                  required: true,
                  label: {
                    en: 'Image',
                    de: 'Bild',
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
  hooks: {
    beforeChange: [enforceRepertoireOrderOnly],
    afterChange: [revalidateArtistOnChange],
    afterDelete: [revalidateArtistOnDelete],
  },
}
