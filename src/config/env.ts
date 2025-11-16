/**
 * Environment configuration
 * Centralizes and validates environment variables used throughout the application
 */

/**
 * Public environment variables (safe to use in client components)
 */
export const publicEnv = {
  /**
   * Cloudflare R2 public endpoint for serving images
   * @default 'https://pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev'
   */
  r2PublicEndpoint: process.env.NEXT_PUBLIC_S3_HOSTNAME || 'https://pub-ff0ee23113d64c13b1d4b075f4d0b9b8.r2.dev',
} as const

/**
 * Validates that all required public environment variables are set
 * Should be called during build time
 */
export function validatePublicEnv() {
  if (!process.env.NEXT_PUBLIC_S3_HOSTNAME) {
    console.warn(
      'Warning: NEXT_PUBLIC_S3_HOSTNAME is not set. Using default R2 endpoint. This may cause issues in production.',
    )
  }
}
