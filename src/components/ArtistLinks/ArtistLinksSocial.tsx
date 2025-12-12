'use client'

import { Facebook, Instagram, Music, Twitter, Youtube } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

interface ArtistLinksSocialProps {
  facebookURL?: string | null
  instagramURL?: string | null
  twitterURL?: string | null
  youtubeURL?: string | null
  spotifyURL?: string | null
}

const ArtistLinksSocial: React.FC<ArtistLinksSocialProps> = ({
  facebookURL,
  instagramURL,
  twitterURL,
  youtubeURL,
  spotifyURL,
}) => {
  const t = useTranslations('custom.pages.artist.artistLinks.ariaLabels')

  // Filter and map social media links
  const socialLinks = [
    {
      url: facebookURL,
      icon: Facebook,
      label: t('facebook'),
      platform: 'facebook',
    },
    {
      url: instagramURL,
      icon: Instagram,
      label: t('instagram'),
      platform: 'instagram',
    },
    {
      url: twitterURL,
      icon: Twitter,
      label: t('twitter'),
      platform: 'twitter',
    },
    {
      url: youtubeURL,
      icon: Youtube,
      label: t('youtube'),
      platform: 'youtube',
    },
    {
      url: spotifyURL,
      icon: Music,
      label: t('spotify'),
      platform: 'spotify',
    },
  ].filter((link) => Boolean(link.url))

  // Return null if no social links exist
  if (socialLinks.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-3 md:justify-end">
      {socialLinks.map(({ url, icon: Icon, label, platform }) => (
        <a
          key={platform}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-black hover:text-primary-black/70 focus-visible:outline-primary-yellow transition duration-150 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label={label}
        >
          <Icon className="h-6 w-6" aria-hidden={true} />
        </a>
      ))}
    </div>
  )
}

export default ArtistLinksSocial
