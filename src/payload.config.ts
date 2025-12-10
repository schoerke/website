import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, type Field } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Adapters & Plugins
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { searchPlugin } from '@payloadcms/plugin-search'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

// Collections
import { Artists } from './collections/Artists'
import { Documents } from './collections/Documents'
import { Employees } from './collections/Employees'
import { Images } from './collections/Images'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Recordings } from './collections/Recordings'
import { Repertoire } from './collections/Repertoire'
import { Users } from './collections/Users'

// v2: Newsletter Contact Management
// import { NewsletterContacts } from './collections/NewsletterContacts'

// Translations
import de from './i18n/de'
import en from './i18n/en'

// Search utilities
import { beforeSyncHook } from './utils/search/beforeSyncHook'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  collections: [Artists, Employees, Pages, Posts, Recordings, Repertoire, Users, Images, Documents],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI!,
      authToken: process.env.DATABASE_AUTH_TOKEN!,
    },
  }),
  editor: lexicalEditor(),
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
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    }),

    // Cloudflare R2 Storage for Documents collection (PDFs + ZIPs)
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
    }),

    payloadCloudPlugin(),
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  upload: {
    limits: {
      fileSize: 60_000_000, // 60 MB in bytes (temporarily increased for migration)
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
