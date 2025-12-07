/**
 * KBar Tutorial Overlay
 *
 * Shows a one-time tutorial when user first visits the site.
 * Explains how to use the Cmd+K / Ctrl+K search shortcut.
 *
 * Features:
 * - Shows once per user (localStorage)
 * - Auto-dismisses after 5 seconds
 * - Manually dismissible
 * - Localized content
 */

'use client'

import { X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'

const TUTORIAL_SEEN_KEY = 'kbar-tutorial-seen'

const KBarTutorial: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const locale = useLocale()

  useEffect(() => {
    // Check if tutorial has been seen
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY)

    if (!hasSeenTutorial) {
      // Show tutorial after a short delay
      const showTimeout = setTimeout(() => {
        setIsVisible(true)
      }, 1000)

      // Auto-dismiss after 5 seconds
      const hideTimeout = setTimeout(() => {
        setIsVisible(false)
        localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
      }, 6000)

      return () => {
        clearTimeout(showTimeout)
        clearTimeout(hideTimeout)
      }
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
  }

  if (!isVisible) return null

  const content = {
    de: {
      title: 'Schnellsuche',
      tip1: 'Drücken Sie ⌘K (Strg+K) jederzeit zum Öffnen der Schnellsuche',
      tip2: 'Navigieren Sie mit den Pfeiltasten ↑↓, wählen Sie mit Enter',
      tip3: 'Suchen Sie alles oder verwenden Sie Shortcuts zur Navigation',
    },
    en: {
      title: 'Quick Search',
      tip1: 'Press ⌘K (Ctrl+K) anytime to open quick search',
      tip2: 'Navigate with arrows ↑↓, select with Enter',
      tip3: 'Search anything or use shortcuts to navigate',
    },
  }

  const t = content[locale as 'de' | 'en'] || content.en

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up rounded-lg bg-white p-4 shadow-2xl ring-1 ring-gray-200">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{t.title}</h3>
        <button
          onClick={handleDismiss}
          className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
        <li className="flex items-start">
          <span className="mr-2">•</span>
          <span>{t.tip1}</span>
        </li>
        <li className="flex items-start">
          <span className="mr-2">•</span>
          <span>{t.tip2}</span>
        </li>
        <li className="flex items-start">
          <span className="mr-2">•</span>
          <span>{t.tip3}</span>
        </li>
      </ul>
    </div>
  )
}

export default KBarTutorial
