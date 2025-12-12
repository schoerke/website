'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const SUPPORTED_LOCALES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
]

const LocaleSwitcher: React.FC = () => {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const currentLocale = useLocale()
  const [open, setOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const firstOptionRef = useRef<HTMLButtonElement>(null)

  const handleLocaleChange = (locale: string) => {
    // Preserve hash fragment when switching locales
    const hash = window.location.hash

    // Announce language change to screen readers
    const localeLabel = SUPPORTED_LOCALES.find((l) => l.code === locale)?.label
    setAnnouncement(`Language changed to ${localeLabel}`)

    // With `pathnames`: Pass `params` as well
    router.replace(
      // @ts-expect-error -- TypeScript will validate that only known `params`
      // are used in combination with a given `pathname`. Since the two will
      // always match for the current route, we can skip runtime checks.
      { pathname, params },
      { locale, scroll: false },
    )

    // Re-apply hash after navigation
    // Note: This uses requestAnimationFrame for better timing than setTimeout(0)
    if (hash) {
      requestAnimationFrame(() => {
        window.location.hash = hash
      })
    }

    setOpen(false)

    // Clear announcement after screen reader has read it
    setTimeout(() => setAnnouncement(''), 1000)
  }

  // Close on click outside and handle keyboard
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [open])

  // Focus first option when drawer opens
  useEffect(() => {
    if (open && firstOptionRef.current) {
      firstOptionRef.current.focus()
    }
  }, [open])

  // Close drawer on route change
  useEffect(() => {
    if (open) {
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div ref={containerRef} className="relative flex justify-end">
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Morphing container - expands left, rounded left corners only */}
      <div
        className={`flex items-center justify-end overflow-hidden px-4 transition-all duration-300 ease-out ${
          open ? 'w-56' : ''
        }`}
        style={{ height: '40px', width: open ? undefined : '80px' }}
      >
        {/* Language options - appear on left */}
        {open && (
          <nav aria-label="Language selector" className="mr-3 flex items-center gap-3 border-r border-gray-300 pr-3">
            {SUPPORTED_LOCALES.map(({ code, label }, index) => {
              const isCurrent = code === currentLocale

              return (
                <button
                  key={code}
                  ref={index === 0 ? firstOptionRef : null}
                  onClick={() => handleLocaleChange(code)}
                  aria-current={isCurrent ? 'page' : undefined}
                  lang={code}
                  className={`relative whitespace-nowrap text-sm transition duration-150 ease-in-out ${
                    isCurrent
                      ? 'font-bold text-gray-900'
                      : 'text-gray-600 after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:bg-gray-900 after:transition-all after:duration-300 hover:text-gray-900 hover:after:w-full'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </nav>
        )}

        {/* Language code button - shows all options with active one bolded */}
        <button
          onClick={() => setOpen(!open)}
          className="flex shrink-0 items-center justify-center gap-1"
          aria-label={`Select language (current: ${SUPPORTED_LOCALES.find((l) => l.code === currentLocale)?.label})`}
          aria-expanded={open}
        >
          {SUPPORTED_LOCALES.map(({ code }, index) => {
            const isCurrent = code === currentLocale
            return (
              <span key={code} className="flex items-center gap-1">
                <span className={`text-sm ${isCurrent ? 'font-bold text-gray-900' : 'font-normal text-gray-500'}`}>
                  {code.toUpperCase()}
                </span>
                {index < SUPPORTED_LOCALES.length - 1 && <span className="text-sm text-gray-400">/</span>}
              </span>
            )
          })}
        </button>
      </div>
    </div>
  )
}

export default LocaleSwitcher
