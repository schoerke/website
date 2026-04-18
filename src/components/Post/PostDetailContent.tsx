import BackButton from '@/components/ui/BackButton'
import PayloadRichText from '@/components/ui/PayloadRichText'
import SchoerkeLink from '@/components/ui/SchoerkeLink'
import type { Artist, Post } from '@/payload-types'
import { formatDate } from '@/utils/post'
import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'

interface PostDetailContentProps {
  title: string
  content: Post['content']
  createdAt: string
  imageUrl: string | null
  locale: 'de' | 'en'
  relatedArtists: Artist[]
  /** Href for both the top back button and the bottom navigation link */
  backHref: string
  /** Label for the bottom navigation link (always navigates to backHref) */
  backLabel: string
  /** Label for the top back button (uses browser history, falls back to backHref) */
  backButtonLabel: string
  relatedArtistLabel: string
  relatedArtistsLabel: string
}

const PostDetailContent: React.FC<PostDetailContentProps> = ({
  title,
  content,
  createdAt,
  imageUrl,
  locale,
  relatedArtists,
  backHref,
  backLabel,
  backButtonLabel,
  relatedArtistLabel,
  relatedArtistsLabel,
}) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Back button */}
      <div className="mb-8">
        <BackButton label={backButtonLabel} fallbackHref={backHref} className="text-sm" />
      </div>

      {/* Article header */}
      <article>
        <header className="mb-8">
          <h1 className="font-playfair mb-4 break-words text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
            {title}
          </h1>

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

      {/* Bottom row: back link left, related artists right */}
      <div className="mt-12 flex items-start justify-between border-t border-gray-200 pt-8">
        <SchoerkeLink href={backHref} variant="with-icon" className="font-semibold">
          <ChevronLeft className="h-4 w-4" aria-hidden={true} />
          <span className="after:bg-primary-yellow relative after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:after:w-full">
            {backLabel}
          </span>
        </SchoerkeLink>

        {relatedArtists.length > 0 && (
          <div className="text-right">
            <h2 className="mb-2 font-semibold text-gray-900">
              {relatedArtists.length === 1 ? relatedArtistLabel : relatedArtistsLabel}
            </h2>
            <ul className="flex flex-wrap justify-end gap-3">
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
      </div>
    </div>
  )
}

export default PostDetailContent
