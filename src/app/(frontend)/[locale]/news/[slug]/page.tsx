import PostDetailContent from '@/components/Post/PostDetailContent'
import { getFilteredPosts, getPostBySlug } from '@/services/post'
import { getValidImageUrl } from '@/utils/image'
import { validateLocale } from '@/utils/locale'
import { getRelatedArtists } from '@/utils/post'
import { getTranslations, setRequestLocale } from 'next-intl/server'
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
        ...posts.docs
          .filter((post) => !!post.slug)
          .map((post) => ({
            locale,
            slug: post.slug,
          }))
      )
    }

    return params
  } catch (error) {
    console.warn('Failed to generate static params for news posts:', error)
    return []
  }
}

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: rawLocale } = await params
  const locale = validateLocale(rawLocale)

  setRequestLocale(locale)

  const post = await getPostBySlug(slug, locale)

  if (!post) return notFound()

  const t = await getTranslations({ locale, namespace: 'custom.pages.news' })

  const { title, content, createdAt, image, artists } = post

  return (
    <PostDetailContent
      title={title}
      content={content}
      createdAt={createdAt}
      imageUrl={getValidImageUrl(image)}
      locale={locale}
      relatedArtists={getRelatedArtists(artists)}
      backHref="/news"
      backLabel={t('allNews')}
      backButtonLabel={t('goBack')}
      relatedArtistLabel={t('relatedArtist')}
      relatedArtistsLabel={t('relatedArtists')}
    />
  )
}
