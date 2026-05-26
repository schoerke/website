'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { Link } from '@/i18n/navigation'

const LOGO_HEIGHT_FULL = 64
const LOGO_HEIGHT_SMALL = 48
const SCROLL_RANGE = 80 // px of scroll over which transition completes

interface ScrollAwareLogoProps {
  iconUrl: string
  iconAlt: string
  fullUrl: string
  fullAlt: string
}

const ScrollAwareLogo: React.FC<ScrollAwareLogoProps> = ({ iconUrl, iconAlt, fullUrl, fullAlt }) => {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const progress = Math.min(window.scrollY / SCROLL_RANGE, 1)
      const height = Math.round(LOGO_HEIGHT_FULL - progress * (LOGO_HEIGHT_FULL - LOGO_HEIGHT_SMALL))
      if (imgRef.current) imgRef.current.style.height = `${height}px`
    }

    handleScroll() // sync initial state (e.g. back-nav restores scroll position)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Link href="/" aria-label="Home" className="flex items-center">
      {/* Icon-only: mobile */}
      <div className="sm:hidden">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={iconAlt}
            width={120}
            height={120}
            priority
            unoptimized
            className="hover:opacity-80"
            style={{ width: 'auto', height: '40px' }}
          />
        ) : (
          <span className="text-lg font-semibold">KSSchoerke</span>
        )}
      </div>
      {/* Full logo: sm and up, scroll-shrink enabled */}
      <div className="hidden sm:block">
        {fullUrl && (
          <Image
            ref={imgRef}
            src={fullUrl}
            alt={fullAlt}
            width={400}
            height={120}
            priority
            unoptimized
            className="hover:opacity-80"
            style={{ width: 'auto', height: `${LOGO_HEIGHT_FULL}px` }}
          />
        )}
      </div>
    </Link>
  )
}

export default ScrollAwareLogo
