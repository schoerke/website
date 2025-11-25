import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: {
      de: 'Seite',
      en: 'Page',
    },
    plural: {
      de: 'Seiten',
      en: 'Pages',
    },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    group: 'Content Management',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
      label: {
        de: 'Titel',
        en: 'Title',
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
        description: {
          de: 'URL-Pfad für diese Seite (z.B. "impressum" für DE, "imprint" für EN)',
          en: 'URL path for this page (e.g. "impressum" for DE, "imprint" for EN)',
        },
      },
      label: {
        de: 'URL-Slug',
        en: 'URL Slug',
      },
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
      required: true,
      label: {
        de: 'Inhalt',
        en: 'Content',
      },
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
