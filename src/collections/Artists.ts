import type { CollectionConfig } from 'payload'

export const Artists: CollectionConfig = {
  admin: {
    group: {
      de: 'Künstler Management',
      en: 'Artist Management',
    },
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      required: true,
      type: 'text',
    },
    {
      label: {
        de: 'Biographie',
        en: 'Biography',
      },
      localized: true,
      name: 'biography',
      required: true,
      type: 'richText',
    },
    {
      admin: {
        position: 'sidebar',
      },
      name: 'image',
      relationTo: 'media',
      type: 'upload',
    },
  ],
  slug: 'artists',
}
