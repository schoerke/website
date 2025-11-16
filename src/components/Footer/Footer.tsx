import FooterLogo from '@/components/Footer/FooterLogo'
import { GENERAL_CONTACT } from '@/constants/contact'

const Footer = async () => {
  return (
    <footer className="bg-primary-platinum">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
          <div className="order-1 flex flex-col items-start lg:col-start-1 xl:col-auto">
            <FooterLogo />
          </div>

          <div className="order-3 mt-4 md:mt-0 lg:col-start-2 lg:row-span-2 xl:col-auto">
            <ul className="space-y-3">
              {[
                { text: 'Home', href: '/' },
                { text: 'Artists', href: '/artists' },
                { text: 'News', href: '/news' },
                { text: 'Projects', href: '/projects' },
                { text: 'Team', href: '/team' },
              ].map((link) => (
                <li key={link.text}>
                  <a href={link.href} className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800">
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-4 mt-4 md:mt-0 lg:col-start-2 xl:col-auto">
            <ul className="space-y-3">
              {[
                { text: 'Contact', href: '/contact' },
                { text: 'Impressum', href: '/impressum' },
                { text: 'Datenschutz', href: '/datenschutz' },
                { text: 'Branding', href: '/brand' },
              ].map((link) => (
                <li key={link.text}>
                  <a href={link.href} className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800">
                    {link.text}
                  </a>
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
            &copy; {new Date().getFullYear()} Künstlersekretariat Astrid Schoerke GmbH. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
