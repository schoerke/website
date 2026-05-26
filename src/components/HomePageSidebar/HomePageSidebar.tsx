import SchoerkeLink from '@/components/ui/SchoerkeLink'
import { getTranslations } from 'next-intl/server'

interface HomePageSidebarProps {
  locale: 'de' | 'en'
}

const HomePageSidebar = async ({ locale }: HomePageSidebarProps) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })

  const navLinks = [
    { text: t('artists.title'), href: '/artists' },
    { text: t('news.title'), href: '/news' },
    { text: t('projects.title'), href: '/projects' },
    { text: t('contact.title'), href: '/kontakt' },
  ]

  return (
    <aside className="hidden lg:flex lg:flex-col lg:gap-6 items-end text-right">
      {/* TODO: pull from site settings global once CMS field exists */}
      <h3 className="font-playfair mb-0 text-2xl font-bold">
        Künstlersekretariat
        <br />
        Astrid Schoerke GmbH
      </h3>
      <address className="not-italic text-gray-600 text-sm leading-relaxed space-y-1">
        <p>Emanuel-Geibel-Str. 10</p>
        <p>D-65185 Wiesbaden</p>
        <p>
          <SchoerkeLink href="mailto:info@ks-schoerke.de" variant="animated" className="text-sm">
            info@ks-schoerke.de
          </SchoerkeLink>
        </p>
        <p>
          <SchoerkeLink href="tel:+4906115058950" variant="animated" className="text-sm">
            +49 (0)611-50 58 90 50
          </SchoerkeLink>
        </p>
      </address>

      <nav aria-label="Sidebar navigation" className="mt-4">
        <ul className="flex flex-col gap-3 text-sm uppercase lg:text-lg">
          {navLinks.map((link) => (
            <li key={link.href}>
              <SchoerkeLink href={link.href} variant="animated">
                {link.text}
              </SchoerkeLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default HomePageSidebar
