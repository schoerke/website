import BackButton from '@/components/ui/BackButton'
import PayloadRichText from '@/components/ui/PayloadRichText'
import { publicEnv } from '@/config/env'
import { Link } from '@/i18n/navigation'
import type { Employee, Media } from '@/payload-types'
import { getDefaultAvatar } from '@/services/media'
import { getFilteredPosts, getPostBySlug } from '@/services/post'
import { isEmployee } from '@/utils/collection'
import { validateLocale } from '@/utils/locale'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'

function isMedia(obj: unknown): obj is Media {
  return typeof obj === 'object' && obj !== null && 'url' in obj
}

function getImageUrl(img: Media | null | undefined): string {
  if (!img) return ''
  if (img.url && img.url.startsWith('http')) return img.url
  if (img.filename) {
    // Sanitize filename to prevent path traversal
    const sanitized = img.filename.replace(/\.\./g, '').replace(/^\/+/, '')
    return `${publicEnv.r2PublicEndpoint}/${sanitized}`
  }
  return ''
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateStaticParams() {
  const locales = ['de', 'en'] as const
  const params = []

  for (const locale of locales) {
    const posts = await getFilteredPosts({
      category: 'projects',
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
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: rawLocale } = await params
  const locale = validateLocale(rawLocale)

  // Enable static rendering
  setRequestLocale(locale)

  const [post, defaultImage] = await Promise.all([getPostBySlug(slug, locale), getDefaultAvatar()])

  if (!post) return notFound()

  const t = await getTranslations({ locale, namespace: 'custom.pages.projects' })

  const { title, content, createdAt, image, createdBy } = post
  const postImage = isMedia(image) ? image : null
  const imageUrl = getImageUrl(postImage) || getImageUrl(defaultImage)
  const author = isEmployee(createdBy) ? (createdBy as Employee) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-8">
        <BackButton
          label={t('goBack')}
          fallbackHref="/projects"
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          labelClassName="underline decoration-transparent underline-offset-4 transition-all group-hover:decoration-gray-900"
        />
      </div>

      {/* Article header */}
      <article>
        <header className="mb-8">
          <h1 className="font-playfair mb-4 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">{title}</h1>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <time dateTime={createdAt}>{formatDate(createdAt, locale)}</time>
            {author && (
              <>
                <span aria-hidden="true">·</span>
                <span>{author.name}</span>
              </>
            )}
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

      {/* All Projects link at bottom */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 rounded bg-white px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rotate-180"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {t('allProjects')}
        </Link>
      </div>
    </main>
  )
}
