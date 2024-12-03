import type { CollectionConfig } from 'payload'

export const Artists: CollectionConfig = {
  slug: 'artists',
  access: {
    read: () => true,
  },
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
      name: 'biography',
      type: 'richText',
      required: true,
      localized: true,
      label: {
        de: 'Biographie',
        en: 'Biography',
      },
    },
    {
      name: 'url',
      label: 'Homepage URL',
      type: 'text',
    },
    {
      name: 'contactPersons',
      type: 'relationship',
      relationTo: 'employees',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'image',
      relationTo: 'media',
      type: 'upload',
      label: 'Featured Image',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'biographyPDF',
      type: 'upload',
      label: 'Biography PDF Download',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'instrument',
      type: 'select',
      options: [
        {
          label: 'Piano',
          value: 'piano',
        },
        {
          label: 'Conductor',
          value: 'conductor',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
