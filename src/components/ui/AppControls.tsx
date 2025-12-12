'use client'

import { getShortcutDisplay, usePlatform } from '@/hooks/usePlatform'
import { useKBar } from 'kbar'
import { Menu, Search } from 'lucide-react'
import { useLocale } from 'next-intl'
import LocaleSwitcher from './LocaleSwitcher'

const AppControls: React.FC = () => {
  const { query } = useKBar()
  const locale = useLocale()
  const platform = usePlatform()
  const shortcutKey = getShortcutDisplay(platform, 'K')

  const searchLabel = locale === 'de' ? 'Suchen' : 'Search'

  return (
    <div className="flex h-10 items-center rounded-full bg-gray-100">
      {/* Locale Switcher - left side */}
      <LocaleSwitcher />

      {/* Vertical Divider - shorter than full height */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Kbar Search Button - right side */}
      <button
        onClick={() => query.toggle()}
        className="flex h-full items-center gap-2 px-4 text-gray-600 transition-colors"
        aria-label={searchLabel}
        title={`${searchLabel} (${shortcutKey})`}
      >
        <Menu className="h-4 w-4" />
        <Search className="h-4 w-4" />
        {shortcutKey && <kbd className="hidden text-xs font-semibold text-gray-600 sm:inline">{shortcutKey}</kbd>}
      </button>
    </div>
  )
}

export default AppControls
