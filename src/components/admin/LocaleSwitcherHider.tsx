'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const LOCALIZED_ROUTES = [
  '/admin/collections/artists',
  '/admin/collections/employees',
  '/admin/collections/pages',
  '/admin/collections/posts',
  '/admin/collections/recordings',
  '/admin/collections/repertoire',
]

function isLocalizedRoute(pathname: string): boolean {
  return LOCALIZED_ROUTES.some((route) => pathname.startsWith(route))
}

export default function LocaleSwitcherHider() {
  const pathname = usePathname()

  useEffect(() => {
    const shouldShow = isLocalizedRoute(pathname)

    function applyVisibility() {
      // Payload uses .app-header__localizer in modern versions
      const localizers = document.querySelectorAll('.app-header__localizer')
      localizers.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = shouldShow ? '' : 'none'
        }
      })
    }

    // Use MutationObserver to handle late rendering more efficiently
    const observer = new MutationObserver(() => {
      applyVisibility()
    })

    // Watch for header changes
    const header = document.querySelector('.app-header')
    if (header) {
      observer.observe(header, { childList: true, subtree: true })
    }

    // Apply immediately
    applyVisibility()

    return () => observer.disconnect()
  }, [pathname])

  return null
}
