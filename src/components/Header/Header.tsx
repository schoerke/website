'use client'

import { Link } from '@/i18n/navigation'
import { LOGO_PATH } from '@/services/media'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import AppControls from '../ui/AppControls'

const Header: React.FC = () => {
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
        <Link href="/" className="flex items-center">
          <Image
            src={LOGO_PATH}
            alt="KSSchoerke Logo"
            width={400}
            height={120}
            className="transition-opacity hover:opacity-80"
            style={{ width: 'auto', height: '80px' }}
          />
        </Link>

        {/* App Controls - unified locale switcher + kbar */}
        <AppControls />
      </div>
    </header>
  )
}

export default Header
