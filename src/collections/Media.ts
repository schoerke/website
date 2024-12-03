import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
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
  upload: {
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: 300,
        position: 'center',
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    adminThumbnail: 'thumbnail',
  },
}
