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
import { type NextRequest } from 'next/server'
import { routing } from './src/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  // Extract locale from URL path and add as header for global-not-found page
  const pathname = request.nextUrl.pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/)
  if (localeMatch) {
    const locale = localeMatch[1]
    if (routing.locales.includes(locale as any)) {
      response.headers.set('x-locale', locale)
    }
  }

  return response
}

export const config = {
  matcher: '/((?!api|admin|_next|_vercel|.*\\..*).*)',
}
