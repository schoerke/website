'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'

const SUPPORTED_LOCALES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
]

const LocaleSwitcher: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()

  const handleLocaleChange = (locale: string) => {
    router.replace(pathname, { locale })
  }

  return (
    <nav aria-label="Language selector" className="flex items-center gap-2">
      {SUPPORTED_LOCALES.map(({ code, label }) => {
        const isCurrent = code === currentLocale

        return (
          <button
            key={code}
            onClick={() => handleLocaleChange(code)}
            aria-current={isCurrent ? 'page' : undefined}
            disabled={isCurrent}
            className={`border px-3 py-1 transition-colors ${
              isCurrent
                ? 'pointer-events-none border-gray-800 bg-gray-800 text-white'
                : 'border-gray-300 bg-white text-gray-800 hover:border-gray-500 hover:bg-gray-100 active:bg-gray-200'
            } `}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export default LocaleSwitcher
