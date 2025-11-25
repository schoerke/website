import Image from 'next/image'
import React from 'react'

export type ImageSlideData = {
  src: string
  alt: string
  bannerText?: string
  link?: string
  sizesAttr?: string
}

interface ImageSlideProps {
  image: ImageSlideData
  isActive: boolean
}

const ImageSlide: React.FC<ImageSlideProps> = ({ image, isActive }) => {
  return (
    <div
      className={`relative w-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}
      style={{ aspectRatio: '4 / 3' }}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className="rounded-lg object-cover"
        loading="lazy"
        sizes={image.sizesAttr || '(max-width: 768px) 100vw, 50vw'}
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
