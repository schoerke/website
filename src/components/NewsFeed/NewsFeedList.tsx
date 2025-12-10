'use client'

import { Link } from '@/i18n/navigation'
import type { Image as PayloadImage, Post } from '@/payload-types'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'

interface NewsFeedListProps {
  posts: Post[]
  emptyMessage: string
  category?: 'news' | 'projects'
  defaultImage?: string | null
}

function getImageUrl(img: PayloadImage | null | undefined, defaultImg: string | null | undefined): string {
  // Use post's image if available and valid
  if (img && typeof img === 'object' && img.url && img.url !== 'null' && !img.url.includes('/null')) return img.url

  // Fall back to default image string path
  if (defaultImg && typeof defaultImg === 'string') return defaultImg

  // Final fallback to placeholder
  return '/placeholder.jpg'
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

interface RichTextNode {
  text?: string
  children?: RichTextNode[]
}

function extractTextPreview(content: Post['content'], maxLength: number = 180): string {
  if (!content?.root?.children) return ''

  const textParts: string[] = []

  function extractText(node: RichTextNode): void {
    if (node.text) {
      textParts.push(node.text)
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(extractText)
    }
  }

  content.root.children.forEach((child) => extractText(child as RichTextNode))

  const fullText = textParts.join(' ').trim()
  if (fullText.length <= maxLength) return fullText

  return fullText.substring(0, maxLength).trim() + '...'
}

const NewsFeedList: React.FC<NewsFeedListProps> = ({ posts, emptyMessage, category = 'news', defaultImage = null }) => {
  const t = useTranslations(`custom.pages.${category}`)
  const locale = useLocale()

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  // Determine the base path based on category
  const getPostPath = (post: Post): string => {
    // Check if post has 'projects' in categories
    const hasProjects = post.categories?.includes('projects')
    const basePath = hasProjects ? '/projects' : '/news'
    return `${basePath}/${post.slug}`
  }

  return (
    <div className="divide-y divide-gray-200">
      {posts.map((post) => {
        const img = typeof post.image === 'object' && post.image !== null ? (post.image as PayloadImage) : null
        const imageUrl = getImageUrl(img, defaultImage)
        const preview = extractTextPreview(post.content)
        const postPath = getPostPath(post)

        return (
          <article
            key={post.id}
            className="group grid grid-cols-1 gap-4 py-6 first:pt-0 lg:grid-cols-[140px_1fr_auto] lg:gap-8"
          >
            {/* Date column - only visible on large screens */}
            <div className="hidden lg:block">
              <time dateTime={post.createdAt} className="text-sm font-medium text-gray-500">
                {formatDate(post.createdAt, locale)}
              </time>
            </div>

            {/* Content column */}
            <Link href={postPath as Parameters<typeof Link>['0']['href']} className="flex gap-4 sm:gap-6 lg:contents">
              {/* Image - start on mobile/tablet, end on large screens */}
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden sm:h-28 sm:w-28 lg:order-last">
                <Image
                  src={imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover transition-opacity group-hover:opacity-75"
                  sizes="(max-width: 640px) 80px, 112px"
                />
              </div>

              {/* Text content */}
              <div className="flex flex-1 flex-col justify-center">
                <h3 className="font-playfair group-hover:text-primary-black mb-2 text-lg font-bold leading-tight text-gray-900 transition-colors sm:text-xl">
                  {post.title}
                </h3>
                {preview && (
                  <p className="mb-2 hidden text-sm leading-relaxed text-gray-600 sm:block sm:text-base">{preview}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 sm:text-sm">
                  {/* Date shown inline on mobile/tablet */}
                  <time dateTime={post.createdAt} className="lg:hidden">
                    {formatDate(post.createdAt, locale)}
                  </time>
                  <span className="focus-visible:outline-primary-yellow after:bg-primary-yellow relative hidden font-medium text-gray-600 transition duration-150 ease-in-out after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:text-gray-800 group-hover:after:w-full sm:inline">
                    {t('learnMore')}
                  </span>
                </div>
              </div>
            </Link>
          </article>
        )
      })}
    </div>
  )
}

export default NewsFeedList
