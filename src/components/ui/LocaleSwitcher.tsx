'use client'

import { resolvePostSlugInLocale } from '@/actions/posts'
import { getPathname, usePathname } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useParams, useRouter as useNextRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const SUPPORTED_LOCALES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
] as const

type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

const LocaleSwitcher: React.FC = () => {
  const pathname = usePathname()
  const params = useParams()
  const router = useNextRouter()
  const currentLocale = useLocale() as LocaleCode
  const [announcement, setAnnouncement] = useState('')
  const [isPending, setIsPending] = useState(false)
  const isMountedRef = useRef(true)
  const isPendingRef = useRef(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const targetLocale = SUPPORTED_LOCALES.find((l) => l.code !== currentLocale)!

  const handleLocaleChange = async () => {
    if (isPendingRef.current) return

    isPendingRef.current = true
    const requestId = ++requestIdRef.current
    setIsPending(true)
    const locale: LocaleCode = targetLocale.code

    // Announce language change to screen readers
    setAnnouncement(`Language changed to ${targetLocale.label}`)

    // For routes with localized slugs (e.g. /news/[slug], /projects/[slug]), resolve the slug
    // in the target locale to avoid 404s when the slug differs between languages.
    // `locale` is stripped from params — it's a route segment, not a pathname param.
    const { locale: _locale, ...pathParams } = params
    let resolvedParams = pathParams
    const slug = params?.slug
    const isLocalizedSlugRoute =
      typeof slug === 'string' && (pathname === '/news/[slug]' || pathname === '/projects/[slug]')
    try {
      if (isLocalizedSlugRoute) {
        const targetSlug = await resolvePostSlugInLocale(slug, currentLocale, locale)
        if (targetSlug) {
          resolvedParams = { ...pathParams, slug: targetSlug }
        }
      }

      if (!isMountedRef.current || requestId !== requestIdRef.current) return

      // Read after slug resolution so navigation preserves hash changes made while awaiting it.
      const hash = window.location.hash

      const localizedPathname = getPathname({
        // @ts-expect-error -- `pathname` is dynamic, so TypeScript cannot
        // correlate params with pathname or infer the URL params shape.
        href: { pathname, params: resolvedParams },
        locale,
        forcePrefix: true,
      })
      router.replace(`${localizedPathname}${hash}`, { scroll: false })

      // Clear announcement after screen reader has read it
      setTimeout(() => setAnnouncement(''), 1000)
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        isPendingRef.current = false
        setIsPending(false)
      }
    }
  }

  return (
    <div className="flex items-center justify-end">
      {/* Screen reader announcements */}
      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </output>

      {/* DE / EN toggle - single click switches to the other locale */}
      <button
        onClick={handleLocaleChange}
        disabled={isPending}
        lang={targetLocale.code}
        className="flex h-full shrink-0 cursor-pointer items-center justify-center gap-1 px-4 transition-colors hover:text-gray-900"
        aria-label={`Switch to ${targetLocale.label}`}
      >
        {SUPPORTED_LOCALES.map(({ code }, index) => {
          const isCurrent = code === currentLocale
          return (
            <span key={code} className="flex items-center gap-1">
              <span
                aria-current={isCurrent ? 'true' : undefined}
                className={`text-sm ${isCurrent ? 'font-bold text-gray-900' : 'font-normal text-gray-500'}`}
              >
                {code.toUpperCase()}
              </span>
              {index < SUPPORTED_LOCALES.length - 1 && <span className="text-sm text-gray-400">/</span>}
            </span>
          )
        })}
      </button>
    </div>
  )
}

export default LocaleSwitcher
