import BackButton from '@/components/ui/BackButton'
import PayloadRichText from '@/components/ui/PayloadRichText'
import SchoerkeLink from '@/components/ui/SchoerkeLink'
import { getFilteredPosts, getPostBySlug } from '@/services/post'
import { getValidImageUrl } from '@/utils/image'
import { validateLocale } from '@/utils/locale'
import { formatDate, getRelatedArtists } from '@/utils/post'
import { ChevronLeft } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  try {
    const locales = ['de', 'en'] as const
    const params = []

    for (const locale of locales) {
      const posts = await getFilteredPosts({
        category: 'news',
        locale,
        publishedOnly: true,
      })

      params.push(
        ...posts.docs.map((post) => ({
          locale,
          slug: post.slug,
        })),
      )
    }

    return params
  } catch (error) {
    // Return empty array if posts don't exist yet or database is unavailable
    console.warn('Failed to generate static params for news posts:', error)
    return []
  }
}

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: rawLocale } = await params
  const locale = validateLocale(rawLocale)

  // Enable static rendering
  setRequestLocale(locale)

  const post = await getPostBySlug(slug, locale)

  if (!post) return notFound()

  const t = await getTranslations({ locale, namespace: 'custom.pages.news' })

  const { title, content, createdAt, image, artists } = post
  const imageUrl = getValidImageUrl(image)
  const relatedArtists = getRelatedArtists(artists)

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Back button */}
      <div className="mb-8">
        <BackButton label={t('goBack')} fallbackHref="/news" className="text-sm" />
      </div>

      {/* Article header */}
      <article>
        <header className="mb-8">
          <h1 className="font-playfair mb-4 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">{title}</h1>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <time dateTime={createdAt}>{formatDate(createdAt, locale)}</time>
          </div>
        </header>

        {/* Featured image */}
        {imageUrl && (
          <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        {/* Article content */}
        <div className="prose prose-lg max-w-none">
          <PayloadRichText content={content} />
        </div>
      </article>

      {/* Related Artists */}
      {relatedArtists.length > 0 && (
        <div className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {relatedArtists.length === 1 ? t('relatedArtist') : t('relatedArtists')}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {relatedArtists.map((artist) => (
              <li key={artist.id}>
                <SchoerkeLink href={`/artists/${artist.slug}`} variant="with-icon" className="text-sm">
                  {artist.name}
                </SchoerkeLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All News link at bottom */}
      <div className={relatedArtists.length > 0 ? 'mt-8' : 'mt-12 border-t border-gray-200 pt-8'}>
        <SchoerkeLink href="/news" variant="with-icon" className="font-semibold">
          <ChevronLeft className="h-4 w-4" aria-hidden={true} />
          <span className="after:bg-primary-yellow relative after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:after:w-full">
            {t('allNews')}
          </span>
        </SchoerkeLink>
      </div>
    </main>
  )
}
