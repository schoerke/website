'use client'

import { routing } from '@/i18n/routing'
import { useEffect } from 'react'

/**
 * Frontend Route Group Not Found Page
 *
 * This page handles 404s for URLs that match the (frontend) route group
 * but NOT the [locale] segment (e.g., /nonexistent, /artists without locale prefix).
 *
 * BEHAVIOR:
 * - Detects user's preferred locale from cookies
 * - Redirects to the same path with locale prefix
 * - This triggers global-not-found.tsx which shows proper branded 404
 *
 * WHEN THIS RENDERS:
 * - User visits URL without locale prefix (e.g., /nonexistent)
 * - Route matches (frontend) group but not [locale] segment
 *
 * WHY REDIRECT:
 * - Maintains consistent branded 404 experience with header/footer
 * - Ensures proper localization for all users
 * - Centralizes 404 handling in global-not-found.tsx
 *
 * RELATED FILES:
 * - src/app/global-not-found.tsx - Target of this redirect
 * - middleware.ts - Handles locale routing for valid pages
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
const NotFound: React.FC = () => {
  useEffect(() => {
    // Detect user's preferred locale
    const localeCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]

    let locale: string = routing.locales[0] // Default to German

    if (localeCookie && routing.locales.includes(localeCookie as 'de' | 'en')) {
      locale = localeCookie
    } else {
      // Fallback: try browser language
      const browserLang = navigator.language.split('-')[0].toLowerCase()
      if (routing.locales.includes(browserLang as 'de' | 'en')) {
        locale = browserLang
      }
    }

    // Get current path and redirect to localized version
    const currentPath = window.location.pathname
    window.location.href = `/${locale}${currentPath}`
  }, [])

  return (
    <div className="container flex min-h-screen items-center justify-center py-28">
      <div className="text-center">
        <p className="text-lg">Redirecting...</p>
      </div>
    </div>
  )
}

export default NotFound
