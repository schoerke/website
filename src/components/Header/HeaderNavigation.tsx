import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

interface HeaderNavigationProps {
  locale: string
}

const HeaderNavigation = async ({ locale }: HeaderNavigationProps) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })
  const tHeader = await getTranslations({ locale, namespace: 'custom.header' })

  const navigationLinks = [
    { text: t('artists.title'), href: '/artists' as const },
    { text: t('contact.title'), href: '/kontakt' as const },
  ]

  return (
    <nav aria-label={tHeader('navigationLabel')} className="hidden lg:flex">
      <ul className="flex gap-x-8 text-sm uppercase lg:text-lg">
        {navigationLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="focus-visible:outline-primary-yellow after:bg-primary-yellow relative text-gray-600 transition duration-150 ease-in-out after:absolute after:-bottom-2 after:left-1/2 after:h-1 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 hover:text-gray-800 hover:after:w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {link.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default HeaderNavigation
