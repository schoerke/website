import Footer from '@/components/Footer/Footer'
import Header from '@/components/Header/Header'
import { Button } from '@/components/ui/button'
import { routing } from '@/i18n/routing'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import './(frontend)/globals.css'

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

interface NotFoundTranslations {
  title: string
  description: string
  returnHome: string
}

/**
 * Type guard to validate locale against configured locales
 */
function isValidLocale(locale: string | null): locale is 'de' | 'en' {
  return locale !== null && (routing.locales as readonly string[]).includes(locale)
}

/**
 * Detects locale for global 404 page using multiple fallback strategies
 *
 * Order of precedence:
 * 1. x-locale header (set by middleware)
 * 2. NEXT_LOCALE cookie
 * 3. Accept-Language header (browser language preference)
 * 4. Default locale (de)
 */
async function getLocaleFromUrl(): Promise<'de' | 'en'> {
  const headersList = await headers()

  // Try x-locale header from middleware
  const xLocale = headersList.get('x-locale')
  if (isValidLocale(xLocale)) {
    return xLocale
  }

  // Try NEXT_LOCALE cookie
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')
  if (localeCookie && isValidLocale(localeCookie.value)) {
    return localeCookie.value
  }

  // Try Accept-Language header (browser language preference)
  const acceptLanguage = headersList.get('accept-language')
  if (acceptLanguage) {
    // Parse Accept-Language: "en-US,en;q=0.9,de;q=0.8" -> "en"
    const primaryLang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase()
    if (isValidLocale(primaryLang)) {
      return primaryLang
    }
  }

  // Default to German
  return 'de'
}

/**
 * Global 404 Page (Experimental Feature)
 *
 * Handles all unmatched routes when experimental.globalNotFound is enabled.
 *
 * WHY THIS EXISTS:
 * - Our root layout uses [locale] dynamic segment, making traditional 404s difficult
 * - This bypasses normal Next.js rendering for true 404 responses
 * - Must be a complete HTML document (not wrapped in layout)
 *
 * IMPORTANT NOTES:
 * - Must import own fonts/styles (doesn't inherit from layout)
 * - Uses native <a> tag because next-intl Link requires routing context
 * - Locale detection from x-locale header (set by middleware)
 * - Intentionally excludes SearchProvider for performance
 *
 * RELATED FILES:
 * - src/app/(frontend)/[locale]/not-found.tsx - Handles notFound() calls within routes
 * - middleware.ts - Sets x-locale header for locale detection
 * - next.config.mjs - Enables experimental.globalNotFound
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found#global-not-foundjs-experimental
 */
async function GlobalNotFound() {
  const locale = await getLocaleFromUrl()
  const messages = await getMessages({ locale })

  // Access typed translations (with fallback)
  const messagesRecord = messages as Record<string, unknown>
  const customPages = (messagesRecord.custom as Record<string, unknown>)?.pages as Record<string, unknown>
  const translations: NotFoundTranslations = (customPages?.notFound as NotFoundTranslations) ?? {
    title: locale === 'de' ? 'Seite nicht gefunden' : 'Page Not Found',
    description:
      locale === 'de'
        ? 'Die Seite, die Sie suchen, existiert nicht oder wurde verschoben.'
        : 'The page you are looking for does not exist or has been moved.',
    returnHome: locale === 'de' ? 'Zur Startseite' : 'Return Home',
  }

  return (
    <html lang={locale}>
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1">
            <div className="flex min-h-[60vh] items-center justify-center px-4 py-28 sm:px-6 lg:px-8">
              <div className="w-full max-w-2xl text-center">
                <h1 className="text-primary-black/10 mb-4 text-9xl font-bold">404</h1>
                <h2 className="text-primary-black mb-4 text-3xl font-semibold">{translations.title}</h2>
                <p className="text-primary-black/70 mb-8 text-lg">{translations.description}</p>
                <Button asChild size="lg">
                  {/* Native <a> tag required - next-intl Link needs routing context */}
                  <a href={`/${locale}`}>{translations.returnHome}</a>
                </Button>
              </div>
            </div>
          </main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

export default GlobalNotFound
