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
  collections: [Artists, Employees, Pages, Posts, Recordings, Repertoire, Users, Media],
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
      collections: ['artists', 'employees', 'pages', 'recordings', 'posts', 'repertoire'],
      beforeSync: beforeSyncHook,
      localize: true, // Localizes the 'title' field in search collection
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
        pages: 25,
        repertoire: 10,
      },
      searchOverrides: {
        admin: {
          group: 'System',
        },
        fields: ({ defaultFields }) => [
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

    // Cloudflare R2 via S3 API
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.CLOUDFLARE_S3_BUCKET ?? '',
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
