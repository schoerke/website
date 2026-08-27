'use client'

import { UserRound } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface PostFeaturedImageProps {
  src: string | null
  alt: string
  focalX?: number | null
  focalY?: number | null
}

const PostFeaturedImage: React.FC<PostFeaturedImageProps> = ({ src, alt, focalX, focalY }) => {
  const [imageFailed, setImageFailed] = useState(false)

  const showPlaceholder = !src || imageFailed

  if (showPlaceholder) {
    return (
      <div
        data-testid="post-featured-image-placeholder"
        aria-hidden="true"
        className="flex h-full w-full items-center justify-center bg-gray-100"
      >
        <UserRound className="h-24 w-24 text-gray-300 sm:h-32 sm:w-32" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      style={{
        objectPosition:
          focalX !== undefined && focalX !== null && focalY !== undefined && focalY !== null
            ? `${focalX}% ${focalY}%`
            : undefined,
      }}
      priority
      quality={80}
      sizes="(max-width: 896px) 100vw, 896px"
      onError={() => setImageFailed(true)}
    />
  )
}

export default PostFeaturedImage
