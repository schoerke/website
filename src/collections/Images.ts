import type { CollectionConfig } from 'payload'

export const Images: CollectionConfig = {
  slug: 'images',
  access: {
    read: () => true, // Public read access - no draft status
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  admin: {
    group: 'Media',
    useAsTitle: 'alt',
  },
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'center',
        formatOptions: {
          format: 'webp',
        },
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'centre',
        formatOptions: {
          format: 'webp',
        },
      },
      {
        name: 'tablet',
        width: 1024,
        formatOptions: {
          format: 'webp',
        },
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description: 'Alternative text for accessibility and SEO',
      },
    },
    {
      name: 'credit',
      type: 'text',
      admin: {
        description: 'Photo credit or attribution (e.g., photographer name)',
      },
    },
  ],
}
