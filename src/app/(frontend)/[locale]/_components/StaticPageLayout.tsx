import PayloadRichText from '@/components/ui/PayloadRichText'
import { getPageBySlug } from '@/services/page'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import React from 'react'

interface StaticPageLayoutProps {
  slug: string
  locale: string
}

const StaticPageLayout: React.FC<StaticPageLayoutProps> = async ({ slug, locale }) => {
  // Enable static rendering
  setRequestLocale(locale)

  const page = await getPageBySlug(slug, locale as 'de' | 'en')

  if (!page) {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold sm:text-6xl lg:text-7xl">{page.title}</h1>
      <div className="prose max-w-none">
        <PayloadRichText content={page.content} />
      </div>
    </main>
  )
}

export default StaticPageLayout
