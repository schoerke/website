import { getTranslations } from 'next-intl/server'

const EmptyRecordings = async () => {
  const t = await getTranslations('custom.pages.artist.empty')

  return (
    <div className="py-8 text-center text-gray-500">
      <p>{t('discography')}</p>
    </div>
  )
}

export default EmptyRecordings
