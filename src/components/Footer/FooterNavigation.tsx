import FooterLogo from '@/components/Footer/FooterLogo'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

type FooterNavigationProps = {
  locale: string
}

const FooterNavigation: React.FC<FooterNavigationProps> = async ({ locale }) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })
  const tFooter = await getTranslations({ locale, namespace: 'custom.footer' })

  const navigationLinks = [
    { text: t('home.title'), href: '/' as const },
    { text: t('artists.title'), href: '/artists' as const },
    { text: t('news.title'), href: '/news' as const },
    { text: t('projects.title'), href: '/projects' as const },
    { text: t('team.title'), href: '/team' as const },
    { text: t('contact.title'), href: '/kontakt' as const },
  ]

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-shrink-0">
        <FooterLogo />
      </div>

      <nav aria-label={tFooter('navigationLabel')} className="flex-1">
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm uppercase lg:gap-x-8 lg:text-lg">
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
    </div>
  )
}

export default FooterNavigation
