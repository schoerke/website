'use client'

import { useTranslations } from 'next-intl'
import { ReactNode } from 'react'
import AppControls from '../ui/AppControls'

interface HeaderProps {
  logo: ReactNode
  nav?: ReactNode
}

const Header: React.FC<HeaderProps> = ({ logo, nav }) => {
  const t = useTranslations('custom.accessibility')

  return (
    <header className="w-full">
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
          {nav}
          <AppControls />
        </div>
      </div>
    </header>
  )
}

export default Header
