import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev',
      },
    ],
  },
  // Mark packages as external - prevents Turbopack from bundling them
  // Required for Payload CMS, libsql, and their dependencies
  serverExternalPackages: ['@payloadcms/db-sqlite', '@libsql/client', 'libsql', 'payload', 'pino', 'thread-stream'],
}

export default withPayload(withNextIntl(nextConfig))
