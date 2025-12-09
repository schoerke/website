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
    pagination: {
      previous: 'Previous',
      next: 'Next',
      goPrevious: 'Go to previous page',
      goNext: 'Go to next page',
      goToPage: 'Go to page {page}',
      currentPage: 'Current page, page {page}',
      morePages: 'More pages',
      postsPerPage: 'Posts per page',
      search: 'Search',
      searchMinChars: 'Enter at least {minChars} characters to search',
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
