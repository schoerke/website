'use client'

import SchoerkeLink from '@/components/ui/SchoerkeLink'
import { CalendarDays, ExternalLink } from 'lucide-react'
import { SiFacebook, SiInstagram, SiSpotify, SiX, SiYoutube } from '@icons-pack/react-simple-icons'
import { useTranslations } from 'next-intl'
import React from 'react'

interface ArtistLinksSocialProps {
  homepageURL?: string | null
  externalCalendarURL?: string | null
  facebookURL?: string | null
  instagramURL?: string | null
  twitterURL?: string | null
  youtubeURL?: string | null
  spotifyURL?: string | null
}

function formatDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    // Remove www. prefix from hostname
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    // Fallback to string manipulation if URL parsing fails
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#].*$/, '')
  }
}

const ArtistLinksSocial: React.FC<ArtistLinksSocialProps> = ({
  homepageURL,
  externalCalendarURL,
  facebookURL,
  instagramURL,
  twitterURL,
  youtubeURL,
  spotifyURL,
}) => {
  const t = useTranslations('custom.pages.artist.artistLinks')

  // Filter and map social media links
  const socialLinks = [
    {
      url: externalCalendarURL,
      icon: CalendarDays,
      label: t('ariaLabels.calendar'),
      platform: 'calendar',
      lucide: true,
    },
    {
      url: facebookURL,
      icon: SiFacebook,
      label: t('ariaLabels.facebook'),
      platform: 'facebook',
      lucide: false,
    },
    {
      url: instagramURL,
      icon: SiInstagram,
      label: t('ariaLabels.instagram'),
      platform: 'instagram',
      lucide: false,
    },
    {
      url: twitterURL,
      icon: SiX,
      label: t('ariaLabels.twitter'),
      platform: 'twitter',
      lucide: false,
    },
    {
      url: youtubeURL,
      icon: SiYoutube,
      label: t('ariaLabels.youtube'),
      platform: 'youtube',
      lucide: false,
    },
    {
      url: spotifyURL,
      icon: SiSpotify,
      label: t('ariaLabels.spotify'),
      platform: 'spotify',
      lucide: false,
    },
  ].filter((link) => Boolean(link.url))

  // Return null if no content exists
  if (!homepageURL && socialLinks.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-primary-black mb-2 text-sm font-semibold uppercase tracking-wider">{t('links')}</h3>

      {/* Homepage link */}
      {homepageURL && (
        <div className="mb-2">
          <SchoerkeLink
            href={homepageURL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 text-sm"
            variant="with-icon"
            aria-label={t('ariaLabels.visitHomepage')}
          >
            <span className="after:bg-primary-yellow relative after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:after:w-full">
              {formatDomain(homepageURL)}
            </span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </SchoerkeLink>
        </div>
      )}

      {/* Social media icons */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap gap-3 md:justify-end">
          {socialLinks.map(({ url, icon: Icon, label, platform, lucide }) => (
            <a
              key={platform}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-black hover:text-primary-black/70 focus-visible:outline-primary-yellow transition duration-150 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              aria-label={label}
            >
              {lucide ? (
                <Icon className="h-6 w-6" aria-hidden={true} />
              ) : (
                <Icon width={24} height={24} aria-hidden={true} />
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default ArtistLinksSocial
