import { SOCIAL_MEDIA_LINKS } from '@/constants/socialMedia'
import { Link } from '@/i18n/navigation'
import { Facebook, Twitter, Youtube } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import NextLink from 'next/link'

type FooterInfoProps = {
  locale: string
}

const iconMap = {
  Facebook,
  Twitter,
  Youtube,
}

const translationKeyMap: Record<string, string> = {
  Facebook: 'visitFacebook',
  Twitter: 'visitTwitter',
  Youtube: 'visitYouTube',
}

const FooterInfo: React.FC<FooterInfoProps> = async ({ locale }) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })
  const tFooter = await getTranslations({ locale, namespace: 'custom.footer' })

  const legalLinks = [
    { text: t('impressum.title'), href: '/impressum' as const, external: false },
    { text: t('datenschutz.title'), href: '/datenschutz' as const, external: false },
    { text: t('brand.title'), href: '/brand' as const, external: true },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        {/* Copyright */}
        <p className="text-sm text-gray-500">&copy; Künstlersekretariat Astrid Schoerke GmbH.</p>

        {/* Legal Links */}
        <nav aria-label={tFooter('legalNavigationLabel')} className="hidden md:block">
          <ul className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {legalLinks.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <NextLink
                    href={link.href}
                    className="text-sm text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
                  >
                    {link.text}
                  </NextLink>
                ) : (
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
                  >
                    {link.text}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Social Media Icons */}
        <div className="flex items-center gap-4">
          {SOCIAL_MEDIA_LINKS.filter((link) => link.url).map((link) => {
            const iconName = link.icon as keyof typeof iconMap
            const IconComponent = iconMap[iconName]
            const translationKey = translationKeyMap[link.icon]

            if (!IconComponent) {
              console.warn(`Icon not found for platform: ${link.platform}`)
              return null
            }

            return (
              <a
                key={link.platform}
                href={link.url}
                aria-label={tFooter(
                  `socialMedia.${translationKey}` as
                    | 'socialMedia.visitFacebook'
                    | 'socialMedia.visitInstagram'
                    | 'socialMedia.visitTwitter'
                    | 'socialMedia.visitYouTube',
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
              >
                <IconComponent size={24} aria-hidden="true" />
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default FooterInfo
