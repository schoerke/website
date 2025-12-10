import { authenticated } from '@/access/authenticated'
import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
  slug: 'documents',
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
      admin: {
        description: 'Document title for identification',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description of the document contents',
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
