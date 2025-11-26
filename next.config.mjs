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
    // Increase device sizes for better image optimization
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Increase image sizes for responsive images
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Mark packages as external - prevents bundling them
  // Required for Payload CMS, libsql, and their dependencies
  // pino requires all its dependencies to be external due to dynamic requires
  serverExternalPackages: [
    '@payloadcms/db-sqlite',
    '@libsql/client',
    'libsql',
    'payload',
    'pino',
    'pino-pretty',
    'thread-stream',
    'sonic-boom',
  ],
}

export default withPayload(withNextIntl(nextConfig))
