import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      required: true,
      type: 'text',
    },
    {
      name: 'role',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
      type: 'select',
    },
  ],
  slug: 'users',
}
