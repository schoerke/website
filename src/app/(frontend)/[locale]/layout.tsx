import ErrorBoundary from '@/components/ErrorBoundary'
import Footer from '@/components/Footer/Footer'
import Header from '@/components/Header/Header'
import HeaderLogo from '@/components/Header/HeaderLogo'
import HeaderNavigation from '@/components/Header/HeaderNavigation'
import SearchProvider from '@/components/Search/SearchProvider'
import { routing } from '@/i18n/routing'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import '../globals.css'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Enable static rendering
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ErrorBoundary>
            <SearchProvider>
              <Header logo={<HeaderLogo />} nav={<HeaderNavigation locale={locale} />} />
              <main id="main-content" className="flex-1">
                {children}
              </main>
            </SearchProvider>
          </ErrorBoundary>
          <ErrorBoundary>
            <Footer locale={locale} />
          </ErrorBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
