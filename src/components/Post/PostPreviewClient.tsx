'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'

import type { Post } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import { getRelatedArtists } from '@/utils/post'

import PostDetailContent from './PostDetailContent'

interface PostPreviewClientProps {
  initialData: Post
  locale: 'de' | 'en'
  backHref: string
  backLabel: string
  backButtonLabel: string
  relatedArtistLabel: string
  relatedArtistsLabel: string
}

const postServerURL = process.env.NEXT_PUBLIC_SERVER_URL ?? ''

const PostPreviewClient: React.FC<PostPreviewClientProps> = ({
  initialData,
  locale,
  backHref,
  backLabel,
  backButtonLabel,
  relatedArtistLabel,
  relatedArtistsLabel,
}) => {
  const { data } = useLivePreview<Post>({
    initialData,
    serverURL: postServerURL,
    depth: 1, // must match the initial server-side fetch depth
  })

  const relatedArtists = getRelatedArtists(data.artists)

  return (
    <PostDetailContent
      title={data.title}
      content={data.content}
      createdAt={data.createdAt}
      imageUrl={getValidImageUrl(data.image)}
      focalX={typeof data.image === 'object' && data.image !== null ? data.image.focalX : undefined}
      focalY={typeof data.image === 'object' && data.image !== null ? data.image.focalY : undefined}
      locale={locale}
      relatedArtists={relatedArtists}
      backHref={backHref}
      backLabel={backLabel}
      backButtonLabel={backButtonLabel}
      relatedArtistLabel={relatedArtistLabel}
      relatedArtistsLabel={relatedArtistsLabel}
    />
  )
}

export default PostPreviewClient
