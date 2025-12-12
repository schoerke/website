import type { Document } from '@/payload-types'
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
    biographyPDF?: Document | number | null
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
  // Check if there's any content to display
  const hasSocialLinks = Boolean(
    homepageURL || externalCalendarURL || facebookURL || instagramURL || twitterURL || youtubeURL || spotifyURL,
  )
  const hasDownloads = Boolean(downloads?.biographyPDF || downloads?.galleryZIP)

  // Return null if no content
  if (!hasSocialLinks && !hasDownloads) {
    return null
  }

  return (
    <section className={`space-y-6 sm:text-left md:text-right ${className || ''}`}>
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
