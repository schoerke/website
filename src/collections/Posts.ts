import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'
import { categoryOptions } from '@/data/options'
import { normalizeText } from '@/utils/search/normalizeText'
import { createSlugHook } from '@/utils/slug'

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
      },
      defaultValue: 1, // Eva Wagner
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
