import type { TFunction } from '@payloadcms/translations'
import type { CollectionConfig } from 'payload'
import { richText } from 'payload/shared'
import type { RichTextFieldValidation } from 'payload/shared'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'
import { RECORDING_ROLES } from '@/constants/recordingOptions'
import { RecordingDescriptionWarningFeature } from '@/features/recordingDescriptionWarning/feature.server'
import { validateURL } from '@/validators/fields'
import { recordingDescriptionMessages, validateRecordingDescription } from '@/validators/recordingDescription'
import { revalidateRecordingOnChange, revalidateRecordingOnDelete } from './hooks/revalidateRecording'

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

/**
 * Bypasses content validation only for draft saves, scoped to this field. Same accepted
 * version-restore edge case as Posts: Payload's restoreVersion passes the historical version's
 * own `_status`, not the restore action's target status.
 */
function isDraftSave(data: unknown): boolean {
  return typeof data === 'object' && data !== null && '_status' in data && data._status === 'draft'
}

export const validatePublishedRecordingDescription: RichTextFieldValidation = async (value, options) => {
  if (isDraftSave(options.data)) return true

  const locale = options.req?.locale === 'de' ? 'de' : 'en'
  const messages = recordingDescriptionMessages[locale]

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

  const structureResult = validateRecordingDescription(value)
  if (structureResult === 'malformed') return messages.malformed

  if (!hasEditorValidator(options.editor)) {
    // Should be unreachable: Recordings.description always configures a lexicalEditor, which
    // always supplies a `validate` function. Logged (not thrown) so a future Payload/config
    // change that breaks this assumption is diagnosable instead of silently returning a generic
    // content error.
    console.error(
      'validatePublishedRecordingDescription: options.editor has no validate function',
      options.editor
    )
    return messages.malformed
  }
  const lexicalResult = await options.editor.validate(value, options)
  if (lexicalResult !== true) return lexicalResult

  return structureResult === true ? true : messages[structureResult]
}

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
    listSearchableFields: ['title', 'artists.name'],
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
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          // Recordings description bans media (see admin description): strip the upload and
          // relationship insert features so the toolbar can't add images/media to a description.
          ...defaultFeatures.filter((feature) => feature.key !== 'upload' && feature.key !== 'relationship'),
          RecordingDescriptionWarningFeature(),
        ],
      }),
      validate: validatePublishedRecordingDescription,
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
      relationTo: 'images',
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
      name: 'spotifyURL',
      type: 'text',
      required: false,
      label: {
        en: 'Spotify URL',
        de: 'Spotify-URL',
      },
      admin: {
        description: {
          en: 'Link to this recording on Spotify (e.g. https://open.spotify.com/album/...)',
          de: 'Link zu dieser Aufnahme auf Spotify (z.B. https://open.spotify.com/album/...)',
        },
      },
      validate: validateURL({ allowedDomains: ['spotify.com', 'open.spotify.com'] }),
    },
    {
      name: 'appleMusicURL',
      type: 'text',
      required: false,
      label: {
        en: 'Apple Music URL',
        de: 'Apple Music-URL',
      },
      admin: {
        description: {
          en: 'Link to this recording on Apple Music (e.g. https://music.apple.com/album/...)',
          de: 'Link zu dieser Aufnahme auf Apple Music (z.B. https://music.apple.com/album/...)',
        },
      },
      validate: validateURL({ allowedDomains: ['music.apple.com'] }),
    },
    {
      name: 'artists',
      type: 'relationship',
      relationTo: 'artists',
      required: true,
      hasMany: true,
      minRows: 1,
      label: {
        de: 'Künstler',
        en: 'Artists',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Select one or more artists who performed in this recording',
          de: 'Wählen Sie einen oder mehrere Künstler, die an dieser Aufnahme beteiligt waren',
        },
      },
    },
    {
      name: 'roles',
      type: 'select',
      required: true,
      hasMany: true,
      label: {
        de: 'Rollen',
        en: 'Roles',
      },
      options: RECORDING_ROLES.map((opt) => ({
        value: opt.value,
        label: ({ t }: { t: TFunction }) => t(`custom:recordingRoles:${opt.value}` as Parameters<typeof t>[0]),
      })),
      admin: {
        position: 'sidebar',
        description: {
          en: 'Select one or more roles for the artists in this recording',
          de: 'Wählen Sie eine oder mehrere Rollen für die Künstler dieser Aufnahme',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateRecordingOnChange],
    afterDelete: [revalidateRecordingOnDelete],
  },
  versions: {
    drafts: {
      autosave: false,
      validate: true,
    },
    maxPerDoc: 5,
  },
}
