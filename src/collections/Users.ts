import type { CollectionConfig } from 'payload'

// REFACTOR: Extract access helpers
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Organization',
  },
  auth: true,
  access: {
    create: () => true,
    read: () => true,
    update: ({ req: { user }, id }) => {
      if (user?.role && user.role === 'admin') {
        return true
      }
      return user?.id === id
    },
    delete: ({ req: { user } }) => {
      return Boolean(user)
    },
  },
  fields: [
    {
      name: 'name',
      required: true,
      type: 'text',
    },
    {
      name: 'role',
      access: {
        update: ({ req: { user } }) => {
          if (user?.role && user.role === 'admin') {
            return true
          }
          return false
        },
      },
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
}
