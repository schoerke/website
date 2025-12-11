'use client'

import { getShortcutDisplay, usePlatform } from '@/hooks/usePlatform'
import { useKBar } from 'kbar'
import { Menu, Search } from 'lucide-react'
import { useLocale } from 'next-intl'
import LocaleSwitcher from '../ui/LocaleSwitcher'

const Header: React.FC = () => {
  const { query } = useKBar()
  const locale = useLocale()
  const platform = usePlatform()
  const shortcutKey = getShortcutDisplay(platform, 'K')

  const searchLabel = locale === 'de' ? 'Suchen' : 'Search'

  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Menu trigger button */}
        <button
          onClick={() => query.toggle()}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-600 transition-colors hover:bg-gray-200"
          aria-label={searchLabel}
          title={`${searchLabel} (${shortcutKey})`}
        >
          <Menu className="h-4 w-4" />
          <Search className="h-4 w-4" />
          {shortcutKey && <kbd className="hidden text-xs font-semibold text-gray-600 sm:inline">{shortcutKey}</kbd>}
        </button>

        <LocaleSwitcher />
      </div>
    </header>
  )
}

export default Header
