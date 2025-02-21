import type { CollectionConfig } from 'payload'

export const NewsletterContacts: CollectionConfig = {
  slug: 'newsletter-contacts',
  admin: {
    group: 'Content Management',
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'firstName',
      required: true,
      type: 'text',
    },
    {
      name: 'lastName',
      required: true,
      type: 'text',
    },
    {
      name: 'email',
      required: true,
      unique: true,
      type: 'text',
    },
    {
      name: 'organization',
      type: 'text',
    },
    {
      name: 'newsletterList',
      type: 'select',
      required: true,
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
      options: [
        {
          label: {
            de: 'Orchester',
            en: 'Orchestra',
          },
          value: 'orchestra',
        },
        {
          label: {
            de: 'Kammermusik',
            en: 'Chamber Music',
          },
          value: 'chamberMusic',
        },
      ],
    },
    {
      name: 'language',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      options: [
        {
          label: {
            de: 'Deutsch',
            en: 'German',
          },
          value: 'de',
        },
        {
          label: {
            de: 'Englisch',
            en: 'English',
          },
          value: 'en',
        },
      ],
    },
  ],
}
