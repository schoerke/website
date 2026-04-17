'use client'

import type { Artist, Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import Image from 'next/image'
import React, { useState } from 'react'
import ImageLightbox from './ImageLightbox'

type GalleryImage = NonNullable<Artist['galleryImages']>[number]

interface ImageGalleryProps {
  images: GalleryImage[]
  emptyMessage: string
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, emptyMessage }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <div className="columns-1 gap-1 sm:columns-2 lg:columns-3">
        {images.map((item, idx) => {
          const imageObj = typeof item.image === 'object' ? (item.image as PayloadImage) : null
          const src = getValidImageUrl(item.image)
          const alt = imageObj?.alt || `Gallery image ${idx + 1}`

          return (
            <button
              key={item.id || idx}
              className="group mb-1 block w-full cursor-pointer break-inside-avoid overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => openLightbox(idx)}
              aria-label={`Open image: ${alt}`}
            >
              <Image
                src={src}
                alt={alt}
                width={600}
                height={400}
                className="block h-auto w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </button>
          )
        })}
      </div>

      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}

export default ImageGallery
