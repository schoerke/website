import { authenticated } from '@/access/authenticated'
import { blockReferencedImageDelete } from '@/collections/hooks/blockReferencedImageDelete'
import { limitImageFileSize } from '@/collections/hooks/limitImageFileSize'
import { revalidateImageOnChange, revalidateImageOnDelete } from '@/collections/hooks/revalidateImage'
import type { CollectionConfig } from 'payload'

export const Images: CollectionConfig = {
  slug: 'images',
  labels: {
    singular: {
      de: 'Bild',
      en: 'Image',
    },
    plural: {
      de: 'Bilder',
      en: 'Images',
    },
  },
  access: {
    read: () => true, // Public read access - no draft status
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeChange: [limitImageFileSize],
    beforeDelete: [blockReferencedImageDelete],
    afterChange: [revalidateImageOnChange],
    afterDelete: [revalidateImageOnDelete],
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
        components: {
          Field: '/components/admin/CreditField',
        },
        description: 'Photo credit or attribution (e.g., photographer name)',
      },
    },
  ],
}
