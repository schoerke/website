import type { CollectionConfig } from 'payload'

export const Employees: CollectionConfig = {
  admin: {
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
        de: 'Titel',
        en: 'Title',
      },
      localized: true,
      name: 'title',
      required: true,
      type: 'text',
    },
    {
      name: 'email',
      required: true,
      type: 'email',
    },
    {
      label: {
        de: 'Telefon',
        en: 'Phone',
      },
      name: 'phone',
      required: true,
      type: 'text',
    },
    {
      label: {
        de: 'Mobil',
        en: 'Mobile',
      },
      name: 'mobile',
      required: true,
      type: 'text',
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
  labels: {
    plural: {
      de: 'Mitarbeiter',
      en: 'Employees',
    },
  },
  slug: 'employees',
}
