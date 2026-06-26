'use client'

import { DEFAULT_AVATAR_PATH } from '@/services/media'
import Image from 'next/image'

interface PostFeaturedImageProps {
  src: string
  alt: string
}

const PostFeaturedImage: React.FC<PostFeaturedImageProps> = ({ src, alt }) => {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = DEFAULT_AVATAR_PATH
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      priority
      sizes="(max-width: 896px) 100vw, 896px"
      onError={handleError}
    />
  )
}

export default PostFeaturedImage
