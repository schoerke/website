import Footer from '@/components/Footer/Footer'
import Header from '@/components/Header/Header'
import ScreenWidthIndicator from '@/components/utils/ScreenWidthIndicator'
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
    <html lang={locale}>
      <body className="font-inter text-primary-black flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ScreenWidthIndicator />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
