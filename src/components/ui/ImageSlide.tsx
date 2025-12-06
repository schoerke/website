import Image from 'next/image'
import React from 'react'

export type ImageSlideData = {
  src: string
  alt: string
  bannerText?: string
  link?: string
  sizesAttr?: string
  focalX?: number | null
  focalY?: number | null
}

interface ImageSlideProps {
  image: ImageSlideData
  isActive: boolean
}

const ImageSlide: React.FC<ImageSlideProps> = ({ image, isActive }) => {
  // Convert Payload focal point (0-100) to CSS object-position (percentage)
  const objectPosition =
    image.focalX !== undefined && image.focalX !== null && image.focalY !== undefined && image.focalY !== null
      ? `${image.focalX}% ${image.focalY}%`
      : 'center'

  // Handle image loading errors by falling back to default avatar
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/assets/default-avatar.webp'
  }

  return (
    <div className={`relative h-96 w-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      <Image
        src={image.src}
        alt={image.alt}
        width={400}
        height={400}
        className="h-full w-full rounded-lg object-cover"
        style={{ objectPosition }}
        loading="lazy"
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
