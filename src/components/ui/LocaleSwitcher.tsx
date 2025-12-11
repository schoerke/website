'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'

const SUPPORTED_LOCALES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
]

const LocaleSwitcher: React.FC = () => {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const currentLocale = useLocale()

  const handleLocaleChange = (locale: string) => {
    // Preserve hash fragment when switching locales
    const hash = window.location.hash

    // With `pathnames`: Pass `params` as well
    router.replace(
      // @ts-expect-error -- TypeScript will validate that only known `params`
      // are used in combination with a given `pathname`. Since the two will
      // always match for the current route, we can skip runtime checks.
      { pathname, params },
      { locale, scroll: false },
    )

    // Re-apply hash after navigation (if needed)
    if (hash) {
      setTimeout(() => {
        window.location.hash = hash
      }, 0)
    }
  }

  return (
    <nav aria-label="Language selector" className="flex items-center gap-3">
      {SUPPORTED_LOCALES.map(({ code, label }) => {
        const isCurrent = code === currentLocale

        return (
          <button
            key={code}
            onClick={() => handleLocaleChange(code)}
            aria-current={isCurrent ? 'page' : undefined}
            disabled={isCurrent}
            className={`text-sm transition-colors ${
              isCurrent ? 'pointer-events-none font-bold text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export default LocaleSwitcher
