import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  access: {
    read: () => true,
  },
  admin: {
    group: 'Content Management',
  },
  fields: [
    {
      name: 'alt',
      required: true,
      type: 'text',
    },
  ],
  slug: 'media',
  upload: true,
}
