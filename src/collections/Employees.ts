import type { CollectionConfig } from 'payload'

export const Employees: CollectionConfig = {
  slug: 'employees',
  labels: {
    singular: {
      de: 'Mitarbeiter',
      en: 'Employee',
    },
    plural: {
      de: 'Mitarbeiter',
      en: 'Employees',
    },
  },
  admin: {
    useAsTitle: 'name',
    group: 'Organization',
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
      required: true,
      relationTo: 'media',
      type: 'upload',
    },
    {
      name: 'order',
      required: true,
      type: 'number',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
