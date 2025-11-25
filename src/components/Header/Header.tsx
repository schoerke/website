'use client'
import { useKBar } from 'kbar'
import { Search } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import LocaleSwitcher from '../ui/LocaleSwitcher'

const Header: React.FC = () => {
  const { query } = useKBar()
  const locale = useLocale()
  const [shortcutKey, setShortcutKey] = useState('Ctrl+K') // Default for SSR

  const searchLabel = locale === 'de' ? 'Suchen' : 'Search'

  // Determine the correct shortcut key on client-side only
  useEffect(() => {
    const isMac = navigator.platform.includes('Mac')
    setShortcutKey(isMac ? '⌘K' : 'Ctrl+K')
  }, [])

  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Search trigger button */}
        <button
          onClick={() => query.toggle()}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">{searchLabel}</span>
          <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 sm:inline">
            {shortcutKey}
          </kbd>
        </button>

        <LocaleSwitcher />
      </div>
    </header>
  )
}

export default Header
