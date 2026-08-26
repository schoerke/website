'use client'

import { Link } from '@/i18n/navigation'
import type { Image as PayloadImage, Post } from '@/payload-types'
import { formatDate } from '@/utils/post'
import { getValidImageUrl } from '@/utils/image'
import { UserRound } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'

interface NewsFeedListProps {
  posts: Post[]
  emptyMessage: string
  category?: 'news' | 'projects'
  showDate?: boolean
}

interface NewsFeedItemImageProps {
  src: string | null
  alt: string
}

/**
 * Renders a post's thumbnail image, or a UserRound icon placeholder when
 * there's no valid image or the image fails to load.
 */
const NewsFeedItemImage: React.FC<NewsFeedItemImageProps> = ({ src, alt }) => {
  const [imageFailed, setImageFailed] = useState(false)
  const showPlaceholder = !src || imageFailed

  return (
    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100 sm:h-28 sm:w-28">
      {showPlaceholder ? (
        <div
          data-testid="news-feed-image-placeholder"
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center"
        >
          <UserRound className="h-8 w-8 text-gray-300 sm:h-10 sm:w-10" />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-opacity group-hover:opacity-75"
          sizes="(max-width: 640px) 80px, 112px"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  )
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

const NewsFeedList: React.FC<NewsFeedListProps> = ({ posts, emptyMessage, category = 'news', showDate = true }) => {
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
        const imageUrl = getValidImageUrl(img)
        const preview = extractTextPreview(post.content)
        const postPath = getPostPath(post)

        return (
          <article key={post.id} className="group py-6 first:pt-0">
            {/* Content column */}
            <Link href={postPath as Parameters<typeof Link>['0']['href']} className="flex gap-4 sm:gap-6">
              {/* Image - always on the left */}
              <NewsFeedItemImage src={imageUrl} alt={post.title} />

              {/* Text content */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <h3 className="font-playfair group-hover:text-primary-black mb-2 line-clamp-2 break-words overflow-hidden text-lg font-bold leading-tight text-gray-900 transition-colors sm:text-xl">
                  {post.title}
                </h3>
                {preview && (
                  <p className="mb-2 hidden text-sm leading-relaxed text-gray-600 sm:block sm:text-base">{preview}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 sm:text-sm">
                  {showDate && (
                    <time dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt, locale)}</time>
                  )}
                  <span
                    aria-hidden="true"
                    className="focus-visible:outline-primary-yellow after:bg-primary-yellow relative hidden font-medium text-gray-600 transition duration-150 ease-in-out after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:text-gray-800 group-hover:after:w-full sm:inline"
                  >
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
