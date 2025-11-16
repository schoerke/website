/**
 * next-intl Middleware
 *
 * This middleware automatically handles locale detection and routing for the application.
 * It runs on every request and:
 * 1. Detects the user's preferred locale (from URL, cookies, or Accept-Language header)
 * 2. Redirects to the appropriate locale-prefixed URL if needed
 * 3. Sets locale cookies for consistent experience
 *
 * The matcher ensures this middleware only runs on frontend routes and excludes:
 * - API routes (/api/*)
 * - Admin routes (/admin/*)
 * - Next.js internals (_next/*)
 * - Static files (*.jpg, *.css, etc.)
 *
 * @deprecated Middleware will be deprecated in future Next.js versions in favor of server-side
 * locale detection. See: https://next-intl.dev/blog/next-intl-3-22#adopting-the-request-api-stable
 *
 * @see https://next-intl.dev/docs/routing/middleware
 */
import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: '/((?!api|admin|_next|_vercel|.*\\..*).*)',
}
