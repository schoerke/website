'use client'

import ImageSkeleton from '@/components/ui/ImageSkeleton'
import { useImageLoad } from '@/hooks/useImageLoad'
import { Link } from '@/i18n/navigation'
import { UserRound } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface HomePageSlide {
  src: string | null
  /** Content category slug, e.g. 'news' or 'projects' — translated at render */
  category?: 'news' | 'projects'
  title: string
  /** next-intl compatible destination, e.g. '/news/my-post' */
  destination: { type: 'internal'; href: string | { pathname: string; params: Record<string, string> } }
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
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const pausedRef = useRef(false)
  const pauseStartRef = useRef<number | null>(null)
  const accumulatedRef = useRef(0)
  const firstImage = useImageLoad()
  const t = useTranslations('custom.pages')

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
    // Respect prefers-reduced-motion — no auto-advance, dots still navigate
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tick = (now: number) => {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const elapsed = accumulatedRef.current + (now - (startTimeRef.current ?? now))
      const pct = Math.min(elapsed / interval, 1)
      setProgress(pct)

      if (pct >= 1) {
        // If focus is inside the outgoing slide link, blur it before it
        // becomes aria-hidden — prevents aria-hidden-focus violations.
        if (document.activeElement?.closest('a[aria-label]')) {
          ;(document.activeElement as HTMLElement).blur()
        }
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

  const handleFocus = handleMouseEnter
  const handleBlur = handleMouseLeave

  if (slides.length === 0) return null

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: '4 / 3' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Skeleton — shown until first image loads or errors */}
      {!firstImage.loaded && !firstImage.error && (
        <div className="absolute inset-0">
          <ImageSkeleton fallbackRatio="4 / 3" />
        </div>
      )}

      {/* All slides stacked — crossfade via opacity */}
      {slides.map((slide, idx) => {
        const isActive = idx === activeIndex

        return (
          <Link
            key={
              typeof slide.destination.href === 'string'
                ? slide.destination.href
                : JSON.stringify(slide.destination.href)
            }
            href={slide.destination.href as Parameters<typeof Link>['0']['href']}
            className="absolute inset-0 block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-yellow"
            aria-label={slide.category ? `${t(`${slide.category}.title`)}: ${slide.title}` : slide.title}
            aria-hidden={!isActive}
            tabIndex={isActive ? 0 : -1}
            style={{
              opacity: isActive ? 1 : 0,
              transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            {slide.src ? (
              <Image
                src={slide.src}
                alt=""
                fill
                className="object-cover"
                style={{
                  objectPosition:
                    slide.focalX !== undefined &&
                    slide.focalX !== null &&
                    slide.focalY !== undefined &&
                    slide.focalY !== null
                      ? `${slide.focalX}% ${slide.focalY}%`
                      : 'top',
                }}
                sizes="(max-width: 1024px) 100vw, min(75vw, 888px)"
                priority={idx === 0}
                quality={80}
                ref={idx === 0 ? firstImage.ref : undefined}
                onLoad={idx === 0 ? firstImage.onLoad : undefined}
                onError={idx === 0 ? firstImage.onError : undefined}
              />
            ) : (
              <UserRound className="absolute inset-0 m-auto h-16 w-16 text-gray-300" />
            )}

            {/* Title */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-6 pt-12 sm:px-5 sm:pb-7">
              {slide.category && (
                <div className="mb-2 flex items-center gap-3">
                  <span aria-hidden="true" className="bg-primary-yellow h-0.5 w-10 shrink-0" />
                  <span className="text-shadow-sm text-xs font-bold uppercase tracking-widest text-white sm:text-sm">
                    {t(`${slide.category}.title`)}
                  </span>
                </div>
              )}
              <h3 className="font-playfair text-shadow-md break-words text-2xl font-bold text-white sm:text-4xl">
                {slide.title}
              </h3>
            </div>
          </Link>
        )
      })}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="bg-primary-yellow h-full transition-none" style={{ width: `${progress * 100}%` }} />
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
