'use client'

import { useTranslations } from 'next-intl'
import { ReactNode, useEffect, useRef, useState } from 'react'
import AppControls from '../ui/AppControls'

interface HeaderProps {
  logo: ReactNode
  nav?: ReactNode
}

const Header: React.FC<HeaderProps> = ({ logo, nav }) => {
  const t = useTranslations('custom.accessibility')
  const [localeSwitcherOpen, setLocaleSwitcherOpen] = useState(false)
  const [navVisible, setNavVisible] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (localeSwitcherOpen) {
      // Hide instantly on open
      setNavVisible(false)
    } else {
      // Delay re-show until LocaleSwitcher finishes collapsing (300ms)
      timeoutRef.current = setTimeout(() => setNavVisible(true), 300)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [localeSwitcherOpen])

  return (
    <header className="bg-primary-white sticky top-0 z-50 w-full">
      {/* Skip navigation link for keyboard and screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
      >
        {t('skipToMainContent')}
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo Branding */}
        {logo}

        {/* Right side: nav + app controls grouped together */}
        <div className="flex items-center gap-8">
          {/* Nav visibility: hidden instantly on open, re-shown after 300ms on close
              (intentionally instant — no fade-in, just waits for LocaleSwitcher to finish collapsing) */}
          <div className={navVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}>
            {nav}
          </div>
          <AppControls localeSwitcherOpen={localeSwitcherOpen} onLocaleSwitcherOpenChange={setLocaleSwitcherOpen} />
        </div>
      </div>
    </header>
  )
}

export default Header
