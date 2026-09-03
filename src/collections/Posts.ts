import type { CollectionConfig } from 'payload'
import { richText } from 'payload/shared'
import type { RichTextFieldValidation } from 'payload/shared'

import { postTextState } from '@/data/postTextState'

import { BlocksFeature, TextStateFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'
import { AudioEmbed } from '@/blocks/AudioEmbed'
import { EventDates } from '@/blocks/EventDates'
import { VideoEmbed } from '@/blocks/VideoEmbed'
import { revalidateHomePageOnPostChange, revalidateHomePageOnPostDelete } from '@/collections/hooks/revalidateHomePage'
import { revalidatePostOnChange, revalidatePostOnDelete } from '@/collections/hooks/revalidatePost'
import { syncArtistProjects } from '@/collections/hooks/syncArtistProjects'
import { blockDuplicateSlug } from '@/collections/hooks/blockDuplicateSlug'
import { blockDuplicateTitle } from '@/collections/hooks/blockDuplicateTitle'
import { categoryOptions } from '@/data/options'
import { EventDatesConversionFeature } from '@/features/eventDatesConverter/feature.server'
import { PostContentWarningFeature } from '@/features/postContentWarning/feature.server'
import { normalizeText } from '@/utils/search/normalizeText'
import { extractLexicalText } from '@/utils/search/extractLexicalText'
import { createSlugHook } from '@/utils/slug'
import { generatePostPreviewPath } from '@/utils/preview/url'
import { resolveDefaultCreatedBy } from '@/utils/posts/resolveDefaultCreatedBy'
import { postContentMessages, validatePostContent } from '@/validators/postContent'

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
 * Bypasses content validation only for draft saves, scoped to this field. See
 * docs/superpowers/specs/2026-09-03-post-content-validation-design.md ("Known Limitation") for
 * the accepted version-restore edge case: Payload's restoreVersion passes the historical
 * version's own `_status`, not the restore action's target status.
 */
function isDraftSave(data: unknown): boolean {
  return typeof data === 'object' && data !== null && '_status' in data && data._status === 'draft'
}

export const validatePublishedPostContent: RichTextFieldValidation = async (value, options) => {
  if (isDraftSave(options.data)) return true

  const locale = options.req?.locale === 'de' ? 'de' : 'en'
  const messages = postContentMessages[locale]

  if (
    value === null ||
    value === undefined ||
    (hasRootChildren(value) && value.root.children.length === 0) ||
    isCanonicalEmptyRichText(value)
  ) {
    return await richText(value, options)
  }

  const structureResult = validatePostContent(value)
  if (structureResult === 'malformed') return messages.malformed

  if (!hasEditorValidator(options.editor)) {
    // Should be unreachable: Posts.content always configures a lexicalEditor, which always
    // supplies a `validate` function. Logged (not thrown) so a future Payload/config change that
    // breaks this assumption is diagnosable instead of silently returning a generic content error.
    console.error('validatePublishedPostContent: options.editor has no validate function', options.editor)
    return messages.malformed
  }
  const lexicalResult = await options.editor.validate(value, options)
  if (lexicalResult !== true) return lexicalResult

  return structureResult === true ? true : messages[structureResult]
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  defaultPopulate: {},
  admin: {
    group: 'Content Management',
    useAsTitle: 'title',
    listSearchableFields: ['title', 'normalizedTitle', 'artists.name'],
    livePreview: {
      url: ({ data, req }) => generatePostPreviewPath({ data, req, collection: 'posts' }) ?? null,
    },
    preview: (data, { req }) => generatePostPreviewPath({ data, req, collection: 'posts' }) ?? null,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      admin: {
        components: {
          Field: '/components/admin/TitleSuggestField',
        },
      },
    },
    /**
     * Normalized version of title for diacritic-insensitive search.
     * Auto-populated from title field via beforeChange hook.
     * - Removes diacritics (é → e, ü → u)
     * - Converts to lowercase
     * - Hidden from admin UI
     * - Indexed for fast search performance
     */
    {
      name: 'normalizedTitle',
      type: 'text',
      localized: true,
      index: true,
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }: { siblingData: { title?: string } }) => {
            // Always return a value - empty string if no title
            return siblingData.title ? normalizeText(siblingData.title) : ''
          },
        ],
      },
    },
    /**
     * Normalized version of content for diacritic-insensitive search.
     * Auto-populated from content field via beforeChange hook.
     * - Removes diacritics (é → e, ü → u)
     * - Converts to lowercase
     * - Hidden from admin UI
     * - Indexed for fast search performance
     */
    {
      name: 'normalizedContent',
      type: 'text',
      localized: true,
      index: true,
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }: { siblingData: { content?: unknown } }) => {
            return siblingData.content
              ? normalizeText(extractLexicalText(siblingData.content as Parameters<typeof extractLexicalText>[0]))
              : ''
          },
        ],
      },
    },
    {
      name: 'slug',
      type: 'text',
      localized: true,
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          de: 'Automatisch aus dem Titel generiert',
          en: 'Auto-generated from title',
        },
      },
      hooks: {
        beforeValidate: [createSlugHook('title')],
      },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          PostContentWarningFeature(),
          EventDatesConversionFeature(),
          BlocksFeature({
            blocks: [VideoEmbed, AudioEmbed, EventDates],
          }),
          TextStateFeature({
            state: postTextState,
          }),
        ],
      }),
      validate: validatePublishedPostContent,
    },
    {
      name: 'categories',
      type: 'select',
      hasMany: true,
      label: {
        de: 'Kategorien',
        en: 'Categories',
      },
      admin: {
        position: 'sidebar',
      },
      options: categoryOptions,
    },
    {
      name: 'artists',
      type: 'relationship',
      relationTo: 'artists',
      hasMany: true,
      label: {
        de: 'Verknüpfte Künstler',
        en: 'Related Artists',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Link artists to this post.',
          de: 'Künstler mit diesem Beitrag verknüpfen.',
        },
      },
    },
    {
      name: 'image',
      relationTo: 'images',
      type: 'upload',
      label: {
        de: 'Bild',
        en: 'Image',
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      label: {
        de: 'Erstellt von',
        en: 'Created by',
      },
      type: 'relationship',
      relationTo: 'employees',
      required: true,
      admin: {
        position: 'sidebar',
        description: {
          de: 'Automatisch gesetzt, wenn als Mitarbeiter angemeldet.',
          en: 'Auto-set when logged in as an employee.',
        },
      },
      hooks: {
        beforeValidate: [
          async ({ operation, req, siblingData }) => {
            if (operation !== 'create' || siblingData.createdBy) return undefined
            return resolveDefaultCreatedBy({ req })
          },
        ],
      },
    },
  ],
  hooks: {
    beforeChange: [blockDuplicateTitle, blockDuplicateSlug],
    afterChange: [syncArtistProjects, revalidateHomePageOnPostChange, revalidatePostOnChange],
    afterDelete: [revalidateHomePageOnPostDelete, revalidatePostOnDelete],
  },
  versions: {
    drafts: {
      autosave: false,
      validate: true,
    },
    maxPerDoc: 5,
  },
}
