/**
 * Test wrapper for components that use next-intl
 */

import { NextIntlClientProvider } from 'next-intl'
import React from 'react'

interface NextIntlTestProviderProps {
  children: React.ReactNode
  locale?: string
  messages?: Record<string, any>
}

/**
 * Default test messages for next-intl
 */
const defaultMessages = {
  custom: {
    pages: {
      news: {
        title: 'News',
        learnMore: 'Read more →',
      },
      projects: {
        title: 'Projects',
        learnMore: 'Read more →',
      },
    },
  },
}

/**
 * Provider wrapper for testing components that use next-intl
 */
export const NextIntlTestProvider: React.FC<NextIntlTestProviderProps> = ({
  children,
  locale = 'en',
  messages = defaultMessages,
}) => {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
