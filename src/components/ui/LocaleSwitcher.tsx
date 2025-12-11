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
    <nav aria-label="Language selector" className="flex items-center gap-1">
      {SUPPORTED_LOCALES.map(({ code, label }) => {
        const isCurrent = code === currentLocale

        return (
          <button
            key={code}
            onClick={() => handleLocaleChange(code)}
            aria-current={isCurrent ? 'page' : undefined}
            disabled={isCurrent}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isCurrent ? 'pointer-events-none bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
