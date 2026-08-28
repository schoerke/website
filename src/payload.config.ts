import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, type Field } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Adapters & Plugins
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { resendAdapter } from '@payloadcms/email-resend'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { searchPlugin } from '@payloadcms/plugin-search'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

// Collections
import { Artists } from './collections/Artists'
import { Documents } from './collections/Documents'
import { Employees } from './collections/Employees'
import { Guides } from './collections/Guides'
import { Images } from './collections/Images'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Recordings } from './collections/Recordings'
import { Repertoire } from './collections/Repertoire'
import { Users } from './collections/Users'

// Globals
import { HomePageGlobal } from './globals/HomePage'

// Constants
import { GENERAL_CONTACT } from './constants/contact'

// Translations
import de from './i18n/de'
import en from './i18n/en'

// Search utilities
import { beforeSyncHook } from './utils/search/beforeSyncHook'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const payloadSecret = process.env.PAYLOAD_SECRET
if (!payloadSecret) throw new Error('PAYLOAD_SECRET environment variable is required')
if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI environment variable is required')
if (!process.env.DATABASE_AUTH_TOKEN) throw new Error('DATABASE_AUTH_TOKEN environment variable is required')
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required')
if (!process.env.CLOUDFLARE_S3_BUCKET || !process.env.CLOUDFLARE_S3_ACCESS_KEY || !process.env.CLOUDFLARE_SECRET)
  throw new Error(
    'Cloudflare R2 credentials are required (CLOUDFLARE_S3_BUCKET, CLOUDFLARE_S3_ACCESS_KEY, CLOUDFLARE_SECRET)'
  )

export default buildConfig({
  admin: {
    avatar: {
      Component: '/components/admin/AccountAvatar',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    components: {
      graphics: {
        Logo: '/components/graphics/Logo',
        Icon: '/components/graphics/Icon',
      },
      actions: ['/components/admin/LocaleSwitcherHider'],
    },
  },
  collections: [Artists, Employees, Guides, Pages, Posts, Recordings, Repertoire, Users, Images, Documents],
  globals: [HomePageGlobal],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
  editor: lexicalEditor(),
  email: resendAdapter({
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@example.com',
    defaultFromName: GENERAL_CONTACT.name,
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  i18n: {
    supportedLanguages: { de, en },
    translations: { de, en },
  },
  localization: {
    locales: [
      {
        code: 'de',
        label: 'Deutsch',
      },
      {
        code: 'en',
        label: 'English',
      },
    ],
    defaultLocale: 'de',
    fallback: false,
  },
  plugins: [
    // MCP Plugin for managing collections and globals in the admin panel
    ...(process.env.NODE_ENV !== 'production'
      ? [
          mcpPlugin({
            collections: {
              artists: { enabled: { find: true } },
              employees: { enabled: { find: true } },
              pages: { enabled: { find: true } },
              posts: { enabled: { find: true } },
              recordings: { enabled: { find: true } },
              repertoire: { enabled: { find: true } },
              images: { enabled: { find: true } },
              documents: { enabled: { find: true } },
            },
            globals: {
              'home-page': { enabled: { find: true } },
            },
            overrideApiKeyCollection: (collection) => ({
              ...collection,
              admin: {
                ...collection.admin,
                group: 'System',
                description: 'System-managed. Content creators: nothing to do here — maintained automatically.',
              },
            }),
          }),
        ]
      : []),

    // Search
    searchPlugin({
      collections: ['artists', 'employees', 'pages', 'repertoire'],
      beforeSync: beforeSyncHook,
      localize: true, // Localizes the 'title' field in search collection
      defaultPriorities: {
        artists: 50,
        employees: 15,
        pages: 25,
        repertoire: 10,
      },
      searchOverrides: {
        admin: {
          group: 'System',
        },
        labels: {
          singular: {
            de: 'Suchergebnis',
            en: 'Search Result',
          },
          plural: {
            de: 'Suchergebnisse',
            en: 'Search Results',
          },
        },
        fields: ({ defaultFields }: { defaultFields: Field[] }) => [
          ...defaultFields,
          {
            name: 'displayTitle',
            type: 'text',
            index: true,
            admin: {
              description: 'Clean display title for search results (e.g., artist name, post title)',
            },
          },
          {
            name: 'slug',
            type: 'text',
            index: true,
            admin: {
              description: 'URL slug for routing (artists and posts)',
            },
          },
          {
            name: 'locale',
            type: 'select',
            options: [
              { label: 'German', value: 'de' },
              { label: 'English', value: 'en' },
            ],
            index: true,
            admin: {
              description: 'Locale of the search record for filtering results',
            },
          },
        ],
      },
    }),

    // Vercel Blob Storage for Images collection only
    vercelBlobStorage({
      collections: {
        images: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // clientUploads: browser uploads directly to Blob, bypassing the Vercel
      // Function 4.5MB body limit (enables images > 4.5MB)
      clientUploads: true,
    }),

    // Cloudflare R2 Storage for Documents collection (PDFs + ZIPs)
    // clientUploads: browser uploads directly to R2 via presigned URL, bypassing
    // the Vercel Function 4.5MB body limit (enables large ZIPs up to the global
    // 60MB limit). Requires CORS on the R2 bucket allowing PUT from the site
    // domain — gated behind DOCUMENT_CLIENT_UPLOADS so deploying before the
    // bucket CORS is configured doesn't break document uploads.
    s3Storage({
      bucket: process.env.CLOUDFLARE_S3_BUCKET ?? '',
      collections: {
        documents: {
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }: { filename: string; prefix?: string }) => {
            const baseURL = process.env.NEXT_PUBLIC_R2_HOSTNAME ?? ''
            const path = prefix ? `${prefix}/${filename}` : filename
            return `${baseURL}/${path}`
          },
        },
      },
      config: {
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_S3_ACCESS_KEY ?? '',
          secretAccessKey: process.env.CLOUDFLARE_SECRET ?? '',
        },
        region: 'auto',
        endpoint: process.env.CLOUDFLARE_S3_API_ENDPOINT ?? '',
        forcePathStyle: true, // Required for R2
      },
      clientUploads: process.env.DOCUMENT_CLIENT_UPLOADS === 'true',
    }),
  ],
  secret: payloadSecret,
  sharp,
  upload: {
    limits: {
      fileSize: 60_000_000, // 60 MB to support large zip files or documents
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
