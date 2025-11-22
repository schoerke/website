import { useTranslations } from 'next-intl'
import React from 'react'

const EmptyRecordings: React.FC = () => {
  const t = useTranslations('custom.pages.artist.empty')

  return (
    <div className="py-8 text-center text-gray-500">
      <p>{t('discography')}</p>
    </div>
  )
}

export default EmptyRecordings
