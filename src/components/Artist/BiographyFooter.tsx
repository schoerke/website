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
  const details = [t('season', { season }), credit && t('photo', { credit }), source].filter(Boolean).join(' • ')

  return (
    <footer>
      <p className="font-bold text-sm">{details}</p>
      <p className="font-bold text-sm">{t('consent')}</p>
    </footer>
  )
}

export default BiographyFooter
