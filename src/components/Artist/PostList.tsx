'use client'

import { publicEnv } from '@/config/env'
import { Link } from '@/i18n/navigation'
import type { Media, Post } from '@/payload-types'
import Image from 'next/image'

interface PostListProps {
  posts: Post[]
  emptyMessage: string
}

function getImageUrl(img: Media | null | undefined): string {
  if (!img) return '/placeholder.jpg'
  if (img.url && img.url.startsWith('http')) return img.url
  if (img.filename) return `${publicEnv.r2PublicEndpoint}/${img.filename}`
  return '/placeholder.jpg'
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

const PostList: React.FC<PostListProps> = ({ posts, emptyMessage }) => {
  if (posts.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const img = typeof post.image === 'object' && post.image !== null ? (post.image as Media) : null
        const imageUrl = getImageUrl(img)

        return (
          <article
            key={post.id}
            className="flex gap-6 rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
          >
            {post.image && (
              <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-lg">
                <Image src={imageUrl} alt={post.title} fill className="object-cover" />
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <h3 className="font-playfair mb-2 text-xl font-bold">{post.title}</h3>
              <time className="mb-3 text-sm text-gray-500" dateTime={post.createdAt}>
                {formatDate(post.createdAt, 'en')}
              </time>
              {/* TODO: Add excerpt field to Post model for better preview */}
              <Link href={`/news/${post.id}`} className="mt-auto text-sm font-medium text-blue-600 hover:underline">
                Read more →
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default PostList
