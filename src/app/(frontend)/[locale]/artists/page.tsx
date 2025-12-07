import ArtistGrid from '@/components/Artist/ArtistGrid'
import { getArtistListData } from '@/services/artist'
import { getTranslations, setRequestLocale } from 'next-intl/server'

const ArtistsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'custom.pages.artists' })

  let artists = null
  let error = null

  try {
    const result = await getArtistListData(locale as 'de' | 'en')
    artists = result?.docs || []
  } catch (e) {
    console.error('Error loading artists:', e)
    error = 'Failed to load artists.'
  }

  // Extract unique instruments for filter tabs
  const instruments = artists ? Array.from(new Set(artists.flatMap((artist: any) => artist.instrument || []))) : []

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-8 text-5xl font-bold sm:mb-12">{t('title')}</h1>
      {error && <div className="text-red-600">{error}</div>}
      {!error && artists && artists.length === 0 && <div className="text-gray-500">No artists found.</div>}
      {!error && artists && artists.length > 0 && (
        <ArtistGrid artists={artists.map((a: any) => ({ ...a, id: String(a.id) }))} instruments={instruments} />
      )}
    </main>
  )
}

export default ArtistsPage
