import FooterLogo from '@/components/Footer/FooterLogo'
import { GENERAL_CONTACT } from '@/constants/contact'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import NextLink from 'next/link'

type FooterProps = {
  locale: string
}

const Footer: React.FC<FooterProps> = async ({ locale }) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })

  const navigationLinks = [
    { text: t('home.title'), href: '/' as const, external: false },
    { text: t('artists.title'), href: '/artists' as const, external: false },
    { text: t('news.title'), href: '/news' as const, external: false },
    { text: t('projects.title'), href: '/projects' as const, external: false },
    { text: t('team.title'), href: '/team' as const, external: false },
  ]

  const legalLinks = [
    { text: t('contact.title'), href: '/contact' as const, external: false },
    { text: t('impressum.title'), href: '/impressum' as const, external: false },
    { text: t('datenschutz.title'), href: '/datenschutz' as const, external: false },
    { text: t('brand.title'), href: '/brand' as const, external: true },
  ]

  return (
    <footer className="bg-primary-platinum">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
          <div className="order-1 flex flex-col items-start lg:col-start-1 xl:col-auto">
            <FooterLogo />
          </div>

          <div className="order-3 mt-4 md:mt-0 lg:col-start-2 lg:row-span-2 xl:col-auto">
            <ul className="space-y-3">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-4 mt-4 md:mt-0 lg:col-start-2 xl:col-auto">
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <NextLink
                      href={link.href}
                      className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
                    >
                      {link.text}
                    </NextLink>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
                    >
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-2 mt-4 md:mt-0 lg:col-start-1 xl:order-4 xl:col-auto">
            <address className="text-sm not-italic">
              <div>
                <p className="mb-2 text-xl font-bold">
                  {(() => {
                    const prefix = 'Künstlersekretariat'
                    if (GENERAL_CONTACT.name.startsWith(prefix)) {
                      const rest = GENERAL_CONTACT.name.slice(prefix.length)
                      return (
                        <>
                          {prefix}
                          <br className="md:hidden" />
                          {rest}
                        </>
                      )
                    }
                    return GENERAL_CONTACT.name
                  })()}
                </p>
                <p className="mb-2">{GENERAL_CONTACT.street}</p>
                <p className="mb-2">
                  D-{GENERAL_CONTACT.zipCode} {GENERAL_CONTACT.city}
                </p>
                <p className="mb-2">
                  <a
                    href={`tel:${GENERAL_CONTACT.phone.replace(/[^+\d]/g, '')}`}
                    className="transition duration-150 ease-in-out hover:text-gray-800"
                  >
                    {GENERAL_CONTACT.phone}
                  </a>
                </p>
                <p>
                  <a
                    href={`mailto:${GENERAL_CONTACT.email}`}
                    className="transition duration-150 ease-in-out hover:text-gray-800"
                  >
                    {GENERAL_CONTACT.email}
                  </a>
                </p>
              </div>
            </address>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Künstlersekretariat Astrid Schoerke GmbH.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
