import type { CollectionConfig } from 'payload'

import { postTextState } from '@/data/postTextState'

import { BlocksFeature, TextStateFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'
import { AudioEmbed } from '@/blocks/AudioEmbed'
import { VideoEmbed } from '@/blocks/VideoEmbed'
import { revalidateHomePageOnPostChange, revalidateHomePageOnPostDelete } from '@/collections/hooks/revalidateHomePage'
import { revalidatePostOnChange, revalidatePostOnDelete } from '@/collections/hooks/revalidatePost'
import { syncArtistProjects } from '@/collections/hooks/syncArtistProjects'
import { blockDuplicateSlug } from '@/collections/hooks/blockDuplicateSlug'
import { blockDuplicateTitle } from '@/collections/hooks/blockDuplicateTitle'
import { categoryOptions } from '@/data/options'
import { normalizeText } from '@/utils/search/normalizeText'
import { extractLexicalText } from '@/utils/search/extractLexicalText'
import { createSlugHook } from '@/utils/slug'
import { generatePostPreviewPath } from '@/utils/preview/url'
import { resolveDefaultCreatedBy } from '@/utils/posts/resolveDefaultCreatedBy'

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
    listSearchableFields: ['title', 'normalizedTitle'],
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
          BlocksFeature({
            blocks: [VideoEmbed, AudioEmbed],
          }),
          TextStateFeature({
            state: postTextState,
          }),
        ],
      }),
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
