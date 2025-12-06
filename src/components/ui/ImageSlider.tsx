'use client'
import { Link } from '@/i18n/navigation'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  // Create autoplay plugin instance
  const autoplayPlugin = useMemo(
    () =>
      autoAdvance
        ? Autoplay({
            delay: interval,
            stopOnInteraction: false, // Resume after manual navigation
            stopOnMouseEnter: true, // Pause on hover (UX improvement)
            stopOnFocusIn: true, // Pause on focus (accessibility)
          })
        : null,
    [autoAdvance, interval],
  )

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      duration: 30, // Physics-based scroll speed (default: 25, range: 20-60, higher = faster attraction)
    },
    autoplayPlugin ? [autoplayPlugin] : [],
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

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
      if (emblaApi) {
        emblaApi.scrollTo(idx)
        autoplayPlugin?.reset() // Reset timer on manual navigation
      }
    },
    [emblaApi, autoplayPlugin],
  )

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev()
      autoplayPlugin?.reset() // Reset timer on manual navigation
    }
  }, [emblaApi, autoplayPlugin])

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext()
      autoplayPlugin?.reset() // Reset timer on manual navigation
    }
  }, [emblaApi, autoplayPlugin])

  // Handle empty state
  if (images.length === 0) {
    return null
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {images.map((img, idx) => (
            <div className="min-w-0 flex-[0_0_100%] px-2 sm:flex-[0_0_50%]" key={img.src + idx}>
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
            onClick={scrollPrev}
            aria-label="Previous slide"
            className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
          >
            &#8592;
          </button>
          <button
            onClick={scrollNext}
            aria-label="Next slide"
            className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
          >
            &#8594;
          </button>
        </div>
      )}
      {showDots && (
        <div className="mt-4 flex justify-center gap-3">
          {images.map((_, idx) => (
            <button
              key={idx}
              className={`h-3 w-3 rounded-full transition-colors ${selectedIndex === idx ? 'bg-black' : 'bg-gray-300 hover:bg-gray-400'}`}
              onClick={() => scrollTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={selectedIndex === idx ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageSlider
