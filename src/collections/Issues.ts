import { authenticated } from '@/access/authenticated'
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
    afterChange: [
      async ({ doc, operation, req }) => {
        // Send email notification when a new issue is created
        if (operation === 'create' && req.payload.email) {
          try {
            await req.payload.sendEmail({
              to: process.env.ISSUES_EMAIL_TO || 'admin@yourdomain.com',
              subject: `New Issue: ${doc.title}`,
              html: `
                <h2>New Issue Reported</h2>
                <p><strong>Title:</strong> ${doc.title}</p>
                <p><strong>Status:</strong> ${doc.status}</p>
                <p><strong>Reporter:</strong> ${req.user?.name || req.user?.email || 'Unknown'}</p>
                <p><strong>Description:</strong></p>
                <div>${doc.description ? JSON.stringify(doc.description) : 'No description provided'}</div>
                <br/>
                <p><a href="${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/collections/issues/${doc.id}">View Issue in Admin</a></p>
              `,
            })
          } catch (error) {
            req.payload.logger.error(`Failed to send issue notification email: ${error}`)
          }
        }
      },
    ],
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
