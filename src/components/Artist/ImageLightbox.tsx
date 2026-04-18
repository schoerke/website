'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import React, { useCallback, useEffect } from 'react'
import type { GalleryImage } from './artistTypes'

interface ImageLightboxProps {
  images: GalleryImage[]
  initialIndex: number
  open: boolean
  onClose: () => void
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex, open, onClose }) => {
  const t = useTranslations('custom.pages.artist')
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })

  // Scroll to the correct image when lightbox opens or initialIndex changes
  useEffect(() => {
    if (emblaApi && open) {
      emblaApi.scrollTo(initialIndex, true)
    }
  }, [emblaApi, open, initialIndex])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // Keyboard navigation (Escape handled by Radix Dialog)
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev()
      if (e.key === 'ArrowRight') scrollNext()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, scrollPrev, scrollNext])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex max-h-screen max-w-5xl flex-col items-center border-0 bg-black p-4 text-white">
        <DialogTitle className="sr-only">{t('media.galleryTitle')}</DialogTitle>
        <div className="w-full overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {images.map((item, idx) => {
              const imageObj = typeof item.image === 'object' ? (item.image as PayloadImage) : null
              const src = getValidImageUrl(item.image)
              const caption = imageObj?.credit ? `© ${imageObj.credit}` : imageObj?.alt || null
              const alt = caption || `Gallery image ${idx + 1}`

              return (
                <div key={item.id || idx} className="relative min-w-0 flex-[0_0_100%]">
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 1024px"
                    />
                  </div>
                  {caption && <p className="mt-2 text-center text-sm text-gray-300">{caption}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {images.length > 1 && (
          <div className="mt-4 flex w-full justify-between">
            <button
              onClick={scrollPrev}
              aria-label={t('media.previousImage')}
              className="rounded bg-white/10 px-4 py-2 hover:bg-white/20"
            >
              &#8592;
            </button>
            <button
              onClick={scrollNext}
              aria-label={t('media.nextImage')}
              className="rounded bg-white/10 px-4 py-2 hover:bg-white/20"
            >
              &#8594;
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ImageLightbox
