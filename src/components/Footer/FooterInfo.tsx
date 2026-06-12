import { SOCIAL_MEDIA_LINKS } from '@/constants/socialMedia'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import NextLink from 'next/link'

type FooterInfoProps = {
  locale: string
}

const FooterInfo = async ({ locale }: FooterInfoProps) => {
  const t = await getTranslations({ locale, namespace: 'custom.pages' })
  const tFooter = await getTranslations({ locale, namespace: 'custom.footer' })

  const legalLinks: Array<{
    text: string
    href: '/impressum' | '/datenschutz' | '/brand'
    external: boolean
  }> = [
    { text: t('impressum.title'), href: '/impressum', external: false },
    { text: t('datenschutz.title'), href: '/datenschutz', external: false },
    { text: t('brand.title'), href: '/brand', external: true },
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
                    href={link.href as '/impressum' | '/datenschutz'}
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
          {SOCIAL_MEDIA_LINKS.filter((link) => link.url).map(({ platform, url, Icon, ariaKey }) => (
            <a
              key={platform}
              href={url}
              aria-label={tFooter(
                `socialMedia.${ariaKey}` as
                  | 'socialMedia.visitFacebook'
                  | 'socialMedia.visitInstagram'
                  | 'socialMedia.visitYouTube'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 transition duration-150 ease-in-out hover:text-gray-800"
            >
              <Icon width={24} height={24} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FooterInfo
