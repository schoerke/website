'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'

interface ScrollAwareLogoProps {
  iconUrl: string
  iconAlt: string
  fullUrl: string
  fullAlt: string
}

const ScrollAwareLogo: React.FC<ScrollAwareLogoProps> = ({ iconUrl, iconAlt, fullUrl, fullAlt }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    handleScroll() // sync initial state (e.g. back-nav restores scroll position)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Link href="/" aria-label="Home" className="relative flex items-center">
      {/* Icon-only logo: visible when scrolled */}
      {iconUrl && (
        <Image
          src={iconUrl}
          alt={iconAlt}
          width={120}
          height={120}
          priority
          unoptimized
          className={`transition-all duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
          style={{ width: 'auto', height: '40px' }}
        />
      )}
      {/* Full logo: visible at top */}
      {fullUrl ? (
        <Image
          src={fullUrl}
          alt={fullAlt}
          width={400}
          height={120}
          priority
          unoptimized
          className={`transition-all duration-300 ${scrolled ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}
          style={{ width: 'auto', height: '80px' }}
        />
      ) : (
        <span
          className={`transition-all duration-300 text-lg font-semibold ${scrolled ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}
        >
          KSSchoerke
        </span>
      )}
    </Link>
  )
}

export default ScrollAwareLogo
