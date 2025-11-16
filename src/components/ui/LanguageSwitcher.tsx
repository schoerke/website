'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'

const SUPPORTED_LOCALES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
]

interface LanguageSwitcherProps {
  alternateSlugs?: Record<string, string>
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ alternateSlugs = {} }) => {
  const pathname = usePathname()
  const router = useRouter()
  const currentLocale = useLocale()

  const handleLocaleChange = (locale: string) => {
    router.replace(pathname, { locale })
  }

  return (
    <nav aria-label="Language selector" className="mb-6">
      <ul className="flex gap-2">
        {SUPPORTED_LOCALES.map(({ code, label }) => {
          const isCurrent = code === currentLocale

          return (
            <li key={code}>
              <button
                onClick={() => handleLocaleChange(code)}
                aria-current={isCurrent ? 'page' : undefined}
                disabled={isCurrent}
                className={`${isCurrent ? 'pointer-events-none font-bold opacity-60' : 'hover:underline'}`}
              >
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default LanguageSwitcher
