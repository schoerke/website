// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

// Collections
import { Artists } from './collections/Artists'
import { Employees } from './collections/Employees'
import { Media } from './collections/Media'
import { NewsletterContacts } from './collections/NewsletterContacts'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'

// Translations
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  collections: [Artists, Employees, Posts, Users, Media, NewsletterContacts],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI ?? '',
  }),
  editor: lexicalEditor(),
  i18n: {
    supportedLanguages: { de, en },
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
  },
  plugins: [
    s3Storage({
      bucket: process.env.AWS_S3_BUCKET ?? '',
      collections: {
        media: true,
      },
      config: {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
        },
        region: process.env.AWS_REGION,
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
