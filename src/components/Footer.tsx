import Image from 'next/image'

const Footer: React.FC = () => {
  return (
    <footer>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">
          <div className="order-1 flex flex-col items-start lg:col-start-1 xl:col-auto">
            <Image
              src="https://ik.imagekit.io/qy9qrvele0b/logo_icon.png?updatedAt=1739717132045"
              alt="Schoerke Logo"
              className="mb-4 h-24 w-auto"
              width={96}
              height={96}
            />
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
                  Künstlersekretariat <br className="hidden xl:block" />
                  Astrid Schoerke
                </p>
                <p className="mb-2">Emanuel-Geibel-Str. 10</p>
                <p className="mb-2">D-65185 Wiesbaden</p>
                <p className="mb-2">
                  <a href="tel:+49061150589050" className="transition duration-150 ease-in-out hover:text-gray-800">
                    +49 (0)611-50 58 90 50
                  </a>
                </p>
                <p>
                  <a
                    href="mailto:info@ks-schoerke.de"
                    className="transition duration-150 ease-in-out hover:text-gray-800"
                  >
                    info@ks-schoerke.de
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
