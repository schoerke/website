import type { Document } from '@/payload-types'
import SectionHeading from '@/components/ui/SectionHeading'
import { useTranslations } from 'next-intl'
import React from 'react'
import ArtistLinksDownloads from './ArtistLinksDownloads'
import ArtistLinksSocial from './ArtistLinksSocial'

interface ArtistLinksProps {
  homepageURL?: string | null
  externalCalendarURL?: string | null
  facebookURL?: string | null
  instagramURL?: string | null
  twitterURL?: string | null
  youtubeURL?: string | null
  spotifyURL?: string | null
  downloads?: {
    biographyPdf?: Document | number | null
    galleryZIP?: Document | number | null
  }
  className?: string
}

const ArtistLinks: React.FC<ArtistLinksProps> = ({
  homepageURL,
  externalCalendarURL,
  facebookURL,
  instagramURL,
  twitterURL,
  youtubeURL,
  spotifyURL,
  downloads,
  className,
}) => {
  const t = useTranslations('custom.pages.artist.artistLinks')

  // Check if there's any content to display
  const hasSocialLinks = Boolean(
    homepageURL || externalCalendarURL || facebookURL || instagramURL || twitterURL || youtubeURL || spotifyURL
  )
  const hasDownloads = Boolean(downloads?.biographyPdf || downloads?.galleryZIP)

  // Return null if no content
  if (!hasSocialLinks && !hasDownloads) {
    return null
  }

  return (
    <section className={`md:mt-12 sm:text-left md:text-right ${className || ''}`}>
      <SectionHeading size="small" className="mb-4 md:justify-end">
        {t('heading')}
      </SectionHeading>
      <ArtistLinksSocial
        homepageURL={homepageURL}
        externalCalendarURL={externalCalendarURL}
        facebookURL={facebookURL}
        instagramURL={instagramURL}
        twitterURL={twitterURL}
        youtubeURL={youtubeURL}
        spotifyURL={spotifyURL}
      />
      <ArtistLinksDownloads downloads={downloads} />
    </section>
  )
}

export default ArtistLinks
