import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

import SchoerkeLink from '@/components/ui/SchoerkeLink'

interface ArtistLinksHomepageProps {
  homepageURL?: string | null
  locale?: 'de' | 'en'
}

function formatDomain(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '')
}

const ArtistLinksHomepage: React.FC<ArtistLinksHomepageProps> = ({ homepageURL }) => {
  const t = useTranslations('custom.pages.artist.artistLinks')

  if (!homepageURL) {
    return null
  }

  const displayDomain = formatDomain(homepageURL)
  const ariaLabel = t('ariaLabels.visitHomepage')

  return (
    <div>
      <h3 className="text-primary-black mb-2 text-sm font-semibold uppercase tracking-wider">{t('homepage')}</h3>
      <SchoerkeLink
        href={homepageURL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm"
        aria-label={ariaLabel}
      >
        {displayDomain}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </SchoerkeLink>
    </div>
  )
}

export default ArtistLinksHomepage
