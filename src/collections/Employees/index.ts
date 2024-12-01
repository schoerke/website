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
      name: 'phone',
      required: true,
      type: 'text',
    },
    {
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
  slug: 'employees',
}
