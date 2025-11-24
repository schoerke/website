import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Adapters & Plugins
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { searchPlugin } from '@payloadcms/plugin-search'
import { s3Storage } from '@payloadcms/storage-s3'

// Collections
import { Artists } from './collections/Artists'
import { Employees } from './collections/Employees'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Recordings } from './collections/Recordings'
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
  collections: [Artists, Employees, Posts, Recordings, Users, Media],
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
    // Search Plugin
    searchPlugin({
      collections: ['artists', 'employees', 'recordings', 'posts'],
      beforeSync: beforeSyncHook,
      defaultPriorities: {
        artists: 50,
        recordings: 40,
        posts: ({ doc }) => {
          // Higher priority for news posts
          if (doc.categories && Array.isArray(doc.categories) && doc.categories.includes('news')) {
            return 30
          }
          // Lower priority for project posts
          return 20
        },
        employees: 15,
      },
      searchOverrides: {
        fields: ({ defaultFields }) => [
          ...defaultFields,
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

    // Cloudflare R2
    s3Storage({
      bucket: process.env.CLOUDFLARE_S3_BUCKET ?? '',
      collections: {
        media: true,
      },
      config: {
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_S3_ACCESS_KEY ?? '',
          secretAccessKey: process.env.CLOUDFLARE_SECRET ?? '',
        },
        region: 'auto',
        endpoint: process.env.CLOUDFLARE_S3_API_ENDPOINT ?? '',
      },
    }),

    payloadCloudPlugin(),
  ],
  secret: process.env.PAYLOAD_SECRET || '',
  sharp,
  upload: {
    limits: {
      fileSize: 5_000_000, // 5 MB in bytes
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
