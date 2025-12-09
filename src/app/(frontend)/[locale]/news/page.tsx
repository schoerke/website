import { NewsFeed } from '@/components/NewsFeed'
import { routing } from '@/i18n/routing'
import { getPaginatedPosts } from '@/services/post'
import { parsePaginationParams, shouldRedirectToLastPage } from '@/utils/pagination'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'
type NewsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; limit?: string; search?: string }>
}

export async function generateMetadata({ params, searchParams }: NewsPageProps): Promise<Metadata> {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const { page } = parsePaginationParams(pageParam)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://schoerke.com'
  const canonicalUrl = page === 1 ? `${baseUrl}/${locale}/news` : `${baseUrl}/${locale}/news?page=${page}`

  return {
    alternates: {
      canonical: canonicalUrl,
    },
  }
}

const NewsPage = async ({ params, searchParams }: NewsPageProps) => {
  const { locale: localeParam } = await params
  const { page: pageParam, limit: limitParam, search: searchParam } = await searchParams

  // Validate locale is one of the supported locales
  const locale = routing.locales.includes(localeParam as any) ? (localeParam as 'de' | 'en') : routing.defaultLocale

  const t = await getTranslations({ locale, namespace: 'custom.pages.news' })
  const tPagination = await getTranslations({ locale, namespace: 'custom.pagination' })

  // Parse and validate pagination params
  const { page, limit } = parsePaginationParams(pageParam, limitParam)

  // Get search query (minimum 3 characters)
  const search = searchParam && searchParam.trim().length >= 3 ? searchParam.trim() : undefined

  // Fetch data to validate page number doesn't exceed totalPages
  const result = await getPaginatedPosts({
    category: 'news',
    search,
    page,
    limit,
    locale,
    publishedOnly: true,
  })

  // Redirect if page exceeds totalPages
  if (shouldRedirectToLastPage(page, result.totalPages)) {
    const params = new URLSearchParams()
    params.set('page', result.totalPages.toString())
    params.set('limit', limit.toString())
    if (search) params.set('search', search)
    redirect(`/${locale}/news?${params.toString()}`)
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-8 text-5xl font-bold sm:mb-12">{t('title')}</h1>
      <Suspense
        fallback={
          <div role="status" aria-live="polite" aria-label={t('loading')}>
            <NewsFeed.Skeleton count={limit} showPagination={result.totalPages > 1} />
            <span className="sr-only">{t('loadingPosts')}</span>
          </div>
        }
      >
        <NewsFeed.Server
          preloadedData={result}
          category="news"
          search={search}
          locale={locale}
          page={page}
          limit={limit}
          basePath={`/${locale}/news`}
          searchPlaceholder={tPagination('searchNews')}
        />
      </Suspense>
    </main>
  )
}

export default NewsPage
