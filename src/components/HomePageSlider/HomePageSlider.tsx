'use client'

import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface HomePageSlide {
  src: string
  alt: string
  title: string
  /** next-intl compatible pathname, e.g. '/news/my-post' */
  href: string
  focalX?: number | null
  focalY?: number | null
}

interface HomePageSliderProps {
  slides: HomePageSlide[]
  /** Auto-advance interval in milliseconds (default: 9000) */
  interval?: number
}

const FADE_DURATION_MS = 800

const HomePageSlider: React.FC<HomePageSliderProps> = ({ slides, interval = 9000 }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number>(performance.now())
  const rafRef = useRef<number | null>(null)
  const pausedRef = useRef(false)
  const pauseStartRef = useRef<number | null>(null)
  const accumulatedRef = useRef(0)

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
    setProgress(0)
    startTimeRef.current = performance.now()
    accumulatedRef.current = 0
    pauseStartRef.current = null
  }, [])

  // Animate the progress bar and auto-advance
  useEffect(() => {
    if (slides.length <= 1) return

    const tick = (now: number) => {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const elapsed = accumulatedRef.current + (now - startTimeRef.current)
      const pct = Math.min(elapsed / interval, 1)
      setProgress(pct)

      if (pct >= 1) {
        setActiveIndex((prev) => (prev + 1) % slides.length)
        setProgress(0)
        startTimeRef.current = performance.now()
        accumulatedRef.current = 0
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    startTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [activeIndex, slides.length, interval])

  const handleMouseEnter = useCallback(() => {
    pausedRef.current = true
    pauseStartRef.current = performance.now()
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (pauseStartRef.current !== null) {
      accumulatedRef.current += performance.now() - pauseStartRef.current
      pauseStartRef.current = null
    }
    pausedRef.current = false
  }, [])

  if (slides.length === 0) return null

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: '4 / 3' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* All slides stacked — crossfade via opacity */}
      {slides.map((slide, idx) => {
        const isActive = idx === activeIndex

        return (
          <Link
            key={slide.href}
            href={slide.href as Parameters<typeof Link>['0']['href']}
            className="absolute inset-0 block"
            aria-label={slide.title}
            aria-hidden={!isActive}
            tabIndex={isActive ? 0 : -1}
            style={{
              opacity: isActive ? 1 : 0,
              transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1280px"
              priority={idx === 0}
            />

            {/* Title */}
            <div className="absolute bottom-4 left-4 right-4">
              <div
                className="inline-block max-w-full border-l-4 bg-black/60 px-3 py-1 shadow"
                style={{ borderColor: '#FFD600' }}
              >
                <h3 className="font-playfair break-words text-base font-bold text-white sm:text-lg lg:text-xl">
                  {slide.title}
                </h3>
              </div>
            </div>
          </Link>
        )
      })}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full transition-none" style={{ width: `${progress * 100}%`, backgroundColor: '#FFD600' }} />
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="absolute right-4 top-4 flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === activeIndex ? 'true' : 'false'}
              className={`h-2 w-2 rounded-full transition-colors ${
                idx === activeIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default HomePageSlider
