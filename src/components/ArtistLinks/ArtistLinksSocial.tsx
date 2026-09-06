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
      {/* Homepage link */}
      {homepageURL && (
        <div className="mb-4">
          <SchoerkeLink
            href={homepageURL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 text-sm font-medium"
            variant="with-icon"
            aria-label={t('ariaLabels.visitHomepage')}
          >
            <span className="after:bg-primary-yellow relative after:absolute after:-bottom-1 after:left-1/2 after:h-px after:w-0 after:origin-center after:-translate-x-1/2 after:transition-all after:duration-300 group-hover:after:w-full">
              {formatDomain(homepageURL)}
            </span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </SchoerkeLink>
        </div>
      )}

      {/* Social media icons */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap gap-2.5 md:justify-end">
          {socialLinks.map(({ url, icon: Icon, label, platform, lucide }) => (
            <a
              key={platform}
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative text-primary-black/70 transition duration-150 ease-in-out hover:text-primary-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-yellow"
              aria-label={label}
            >
              {lucide ? (
                <Icon className="h-5 w-5" aria-hidden={true} />
              ) : (
                <Icon width={20} height={20} aria-hidden={true} />
              )}
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-primary-black px-2.5 py-1 text-xs font-medium text-primary-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
              >
                {label}
              </span>
              <span className="absolute -top-9 left-1/2 z-0 hidden h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-primary-black opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default ArtistLinksSocial
