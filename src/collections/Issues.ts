import { authenticated } from '@/access/authenticated'
import { sendIssueNotification } from '@/collections/hooks/sendIssueNotification'
import { lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

export const Issues: CollectionConfig = {
  slug: 'issues',
  labels: {
    singular: {
      de: 'Issue',
      en: 'Issue',
    },
    plural: {
      de: 'Issues',
      en: 'Issues',
    },
  },
  access: {
    // Only authenticated users can access issues (internal only)
    read: authenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    group: 'System',
    useAsTitle: 'title',
    defaultColumns: ['title', 'reporter', 'status', 'createdAt', 'updatedAt'],
  },
  hooks: {
    afterChange: [sendIssueNotification],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: {
        en: 'Title',
        de: 'Titel',
      },
      admin: {
        placeholder: {
          en: 'Briefly describe the issue',
          de: 'Beschreiben Sie das Problem kurz',
        },
      },
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      label: {
        en: 'Description',
        de: 'Beschreibung',
      },
      admin: {
        description: {
          en: 'Please provide steps to reproduce the error. You can optionally add screenshots by dragging and dropping them into the editor.',
          de: 'Bitte geben Sie die Schritte zur Reproduktion des Fehlers an. Sie können optional Screenshots hinzufügen, indem Sie sie in den Editor ziehen.',
        },
      },
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          UploadFeature({
            collections: {
              images: {
                fields: [],
              },
            },
          }),
        ],
      }),
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        {
          label: {
            en: 'Open',
            de: 'Offen',
          },
          value: 'open',
        },
        {
          label: {
            en: 'In Progress',
            de: 'In Bearbeitung',
          },
          value: 'in-progress',
        },
        {
          label: {
            en: 'Resolved',
            de: 'Gelöst',
          },
          value: 'resolved',
        },
        {
          label: {
            en: 'Closed',
            de: 'Geschlossen',
          },
          value: 'closed',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'users',
      label: {
        en: 'Reporter',
        de: 'Melder',
      },
      defaultValue: ({ user }) => user?.id,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'The user who reported this issue',
          de: 'Der Benutzer, der dieses Problem gemeldet hat',
        },
      },
      access: {
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
  ],
}
