import { UserRound } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

export type ImageSlideData = {
  src: string | null
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

  return (
    <div
      className={`relative h-72 w-full transition-opacity duration-300 sm:h-96 md:h-96 ${isActive ? 'opacity-100' : 'opacity-60'}`}
      style={{ aspectRatio: '4 / 3' }}
    >
      {!image.src ? (
        <div
          data-testid="image-slide-placeholder"
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100"
        >
          <UserRound className="h-24 w-24 text-gray-300 sm:h-32 sm:w-32" />
        </div>
      ) : (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="rounded-lg object-cover"
          style={{ objectPosition }}
          loading={loading}
          sizes={image.sizesAttr || '(max-width: 768px) 100vw, 50vw'}
        />
      )}
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
