import { authenticated } from '@/access/authenticated'
import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: {
    singular: {
      de: 'Dokument',
      en: 'Document',
    },
    plural: {
      de: 'Dokumente',
      en: 'Documents',
    },
  },
  access: {
    read: () => true, // Public read access - no draft status
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'Media',
    useAsTitle: 'title',
  },
  upload: {
    mimeTypes: ['application/pdf', 'application/zip', 'application/x-zip-compressed'],
    disableLocalStorage: true, // No image processing needed for documents
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        de: 'Titel',
        en: 'Title',
      },
      admin: {
        description: {
          de: 'Dokumenttitel zur Identifizierung',
          en: 'Document title for identification',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: {
        de: 'Beschreibung',
        en: 'Description',
      },
      admin: {
        description: {
          de: 'Optionale Beschreibung des Dokumentinhalts',
          en: 'Optional description of the document contents',
        },
      },
    },
    {
      name: 'fileSize',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'File size in bytes (auto-populated)',
      },
    },
  ],
}
