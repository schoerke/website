import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import PostPreviewClient from '@/components/Post/PostPreviewClient'
import { getPostBySlug } from '@/services/post'
import { validateLocale } from '@/utils/locale'

export const dynamic = 'force-dynamic'

export default async function PreviewPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: rawLocale } = await params
  const locale = validateLocale(rawLocale)

  setRequestLocale(locale)

  const { isEnabled } = await draftMode()
  if (!isEnabled) return notFound()

  const post = await getPostBySlug(slug, locale, { draft: true })
  if (!post) return notFound()

  const t = await getTranslations({ locale, namespace: 'custom.pages.news' })
  const backHref = post.categories?.includes('projects') ? '/projects' : '/news'

  return (
    <PostPreviewClient
      initialData={post}
      locale={locale}
      backHref={backHref}
      backLabel={t('allNews')}
      backButtonLabel={t('goBack')}
      relatedArtistLabel={t('relatedArtist')}
      relatedArtistsLabel={t('relatedArtists')}
    />
  )
}
