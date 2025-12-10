import { DEFAULT_AVATAR_PATH } from '@/services/media'
import Image from 'next/image'
import React from 'react'

export type ImageSlideData = {
  src: string
  alt: string
  bannerText?: string
  slug?: string // Artist slug for i18n routing
  sizesAttr?: string
  focalX?: number | null
  focalY?: number | null
}

interface ImageSlideProps {
  image: ImageSlideData
  isActive: boolean
  loading?: 'eager' | 'lazy'
}

const ImageSlide: React.FC<ImageSlideProps> = ({ image, isActive, loading = 'lazy' }) => {
  // Convert Payload focal point (0-100) to CSS object-position (percentage)
  const objectPosition =
    image.focalX !== undefined && image.focalX !== null && image.focalY !== undefined && image.focalY !== null
      ? `${image.focalX}% ${image.focalY}%`
      : 'center'

  // Handle image loading errors by falling back to default avatar (Payload first, then static file)
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Try Payload API path first
    if (e.currentTarget.src !== DEFAULT_AVATAR_PATH) {
      e.currentTarget.src = DEFAULT_AVATAR_PATH
    } else {
      // Fallback to static file if Payload fails
      e.currentTarget.src = '/assets/default-avatar.webp'
    }
  }

  return (
    <div
      className={`relative h-72 w-full transition-opacity duration-300 sm:h-96 md:h-96 ${isActive ? 'opacity-100' : 'opacity-60'}`}
      style={{ aspectRatio: '4 / 3' }}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className="rounded-lg object-cover"
        style={{ objectPosition }}
        loading={loading}
        sizes={image.sizesAttr || '(max-width: 768px) 100vw, 50vw'}
        onError={handleImageError}
      />
      {image.bannerText && (
        <div
          className="border-l-6 absolute bottom-2 right-2 border-yellow-400 bg-black/60 px-3 py-1 text-base text-white shadow sm:text-lg"
          style={{ borderColor: '#FFD600' }}
        >
          {image.bannerText}
        </div>
      )}
    </div>
  )
}

export default ImageSlide
