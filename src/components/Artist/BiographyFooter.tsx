'use client'

import type { Artist } from '@/payload-types'
import { isImageObject } from '@/utils/image'
import { useTranslations } from 'next-intl'

interface BiographyFooterProps {
  season: string
  quoteSource?: string | null
  image?: Artist['image']
}

const BiographyFooter: React.FC<BiographyFooterProps> = ({ season, quoteSource, image }) => {
  const t = useTranslations('custom.pages.artist.biographyFooter')
  const credit = isImageObject(image) ? image.credit?.trim() : undefined
  const source = quoteSource?.trim()
  const details = [t('season', { season }), credit && t('photo', { credit }), source && t('quote', { source })].filter(
    (detail): detail is string => Boolean(detail)
  )

  return (
    <footer className="biography-footer">
      <hr className="w-full md:w-3/4" />
      <p data-testid="biography-footer-details" className="font-normal text-sm">
        {details.map((detail, index) => (
          <span key={`${index}-${detail}`} className="block sm:inline">
            {index > 0 && <span className="hidden sm:inline"> • </span>}
            {detail}
          </span>
        ))}
      </p>
      <p className="font-normal text-sm">{t('consent')}</p>
    </footer>
  )
}

export default BiographyFooter
