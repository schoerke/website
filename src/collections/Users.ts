import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

// REFACTOR: Extract access helpers
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    group: 'Organization',
  },
  auth: true,
  access: {
    // Only authenticated users (admins) can create new users
    create: authenticated,
    // Only authenticated users can read user list
    read: authenticated,
    update: ({ req: { user }, id }) => {
      // Admins can update anyone, users can update themselves
      if (user?.role && user.role === 'admin') {
        return true
      }
      return user?.id === id
    },
    delete: ({ req: { user } }) => {
      // Only admins can delete users
      return user?.role === 'admin'
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
