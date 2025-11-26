'use client'
import { Link } from '@/i18n/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import React, { useCallback, useEffect, useState } from 'react'
import ImageSlide, { ImageSlideData } from './ImageSlide'

interface ImageSliderProps {
  images: ImageSlideData[]
  autoAdvance?: boolean
  interval?: number
  showArrows?: boolean
  showDots?: boolean
}

const ImageSlider: React.FC<ImageSliderProps> = ({
  images,
  autoAdvance = true,
  interval = 4000,
  showArrows = true,
  showDots = true,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Auto-advance logic
  useEffect(() => {
    if (!autoAdvance || !emblaApi) return
    const timer = setInterval(() => {
      emblaApi.scrollNext()
    }, interval)
    return () => clearInterval(timer)
  }, [autoAdvance, emblaApi, interval])

  // Update selected index on slide change
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  const scrollTo = useCallback(
    (idx: number) => {
      if (emblaApi) emblaApi.scrollTo(idx)
    },
    [emblaApi],
  )

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {images.map((img, idx) => (
            <div className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] sm:px-2" key={img.src + idx}>
              {img.link ? (
                <Link href={img.link as any} tabIndex={-1} aria-label={img.bannerText || img.alt}>
                  <ImageSlide image={img} isActive={selectedIndex === idx} />
                </Link>
              ) : (
                <ImageSlide image={img} isActive={selectedIndex === idx} />
              )}
            </div>
          ))}
        </div>
      </div>
      {showArrows && (
        <div className="mt-2 flex justify-between">
          <button
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous slide"
            className="rounded bg-gray-200 px-2 py-1"
          >
            &#8592;
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Next slide"
            className="rounded bg-gray-200 px-2 py-1"
          >
            &#8594;
          </button>
        </div>
      )}
      {showDots && (
        <div className="mt-2 flex justify-center gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              className={`h-2 w-2 rounded-full ${selectedIndex === idx ? 'bg-black' : 'bg-gray-300'}`}
              onClick={() => scrollTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageSlider
