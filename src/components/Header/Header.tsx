'use client'

import { Link } from '@/i18n/navigation'
import { LOGO_ICON_PATH } from '@/services/media'
import Image from 'next/image'
import AppControls from '../ui/AppControls'

const Header: React.FC = () => {
  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo Branding */}
        <Link href="/" className="flex items-center">
          <Image
            src={LOGO_ICON_PATH}
            alt="KSSchoerke Logo"
            width={40}
            height={40}
            className="transition-opacity hover:opacity-80"
            style={{ width: 'auto', height: 'auto' }}
          />
        </Link>

        {/* App Controls - unified locale switcher + kbar */}
        <AppControls />
      </div>
    </header>
  )
}

export default Header
