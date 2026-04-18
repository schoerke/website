'use client'

import ImageSkeleton from '@/components/ui/ImageSkeleton'
import type { Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import Image from 'next/image'
import React, { useState } from 'react'
import ImageLightbox from './ImageLightbox'
import type { GalleryImage } from './artistTypes'

interface ImageGalleryProps {
  images: GalleryImage[]
  emptyMessage: string
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, emptyMessage }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = useState<Record<string, boolean>>({})

  const handleLoad = (key: string) => {
    setLoadedMap((prev) => ({ ...prev, [key]: true }))
  }

  const handleError = (key: string) => {
    setErrorMap((prev) => ({ ...prev, [key]: true }))
  }

  if (images.length === 0) {
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
          const key = item.id ? String(item.id) : `idx-${idx}`
          const loaded = loadedMap[key] ?? false
          const hasError = errorMap[key] ?? false

          if (!src) return null

          return (
            <button
              key={key}
              className="group mb-1 block w-full cursor-pointer break-inside-avoid overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={() => openLightbox(idx)}
              aria-label={`Open image: ${alt}`}
            >
              <div className="relative w-full">
                {/* Skeleton shimmer — collapses once image loads */}
                {!loaded && !hasError && (
                  <ImageSkeleton width={imageObj?.width} height={imageObj?.height} fallbackRatio="3 / 2" />
                )}
                {/* Error fallback */}
                {hasError && (
                  <div
                    className="flex w-full items-center justify-center bg-gray-100 text-gray-400"
                    style={{ aspectRatio: '3 / 2' }}
                  >
                    <span className="text-sm">Image unavailable</span>
                  </div>
                )}
                <Image
                  src={src}
                  alt={alt}
                  width={600}
                  height={400}
                  className={`block h-auto w-full object-cover transition-opacity duration-500 group-hover:opacity-80 ${loaded && !hasError ? 'opacity-100' : 'opacity-0'}`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  ref={(node) => {
                    if (node?.complete && !loadedMap[key]) handleLoad(key)
                  }}
                  onLoad={() => handleLoad(key)}
                  onError={() => handleError(key)}
                />
              </div>
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
