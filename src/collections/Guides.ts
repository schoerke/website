import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

const categoryOptions = [
  { label: { de: 'Workflow', en: 'Workflow' }, value: 'workflow' },
  { label: { de: 'Troubleshooting', en: 'Troubleshooting' }, value: 'troubleshooting' },
]

/**
 * Internal editorial guides for the content team (workflow how-tos and
 * troubleshooting notes). Admin-only — never rendered on the public site.
 */
export const Guides: CollectionConfig = {
  slug: 'guides',
  labels: {
    singular: { de: 'Leitfaden', en: 'Guide' },
    plural: { de: 'Leitfäden', en: 'Guides' },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Organization',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'updatedAt'],
    description: {
      de: 'Interne Leitfäden für das Content-Team: Workflow-Anleitungen und Troubleshooting-Hinweise. Nur für das Team sichtbar.',
      en: 'Internal guides for the content team: workflow how-tos and troubleshooting notes. Team-only, never public.',
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: { de: 'Titel', en: 'Title' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: categoryOptions,
      label: { de: 'Kategorie', en: 'Category' },
      defaultValue: 'workflow',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      label: { de: 'Inhalt', en: 'Content' },
    },
  ],
}
