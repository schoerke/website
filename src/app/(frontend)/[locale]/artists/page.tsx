import ArtistGrid from '@/components/Artist/ArtistGrid'
import { Artist } from '@/payload-types'
import { getArtistListData } from '@/services/artist'
import { getTranslations, setRequestLocale } from 'next-intl/server'

const ArtistsPage = async ({ params }: { params: Promise<{ locale: string }> }) => {
  const { locale } = await params

  // Enable static rendering
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'custom.pages.artists' })

  let artists: Artist[] | null = null
  let error: string | null = null

  try {
    const result = await getArtistListData(locale as 'de' | 'en')
    // Type assertion: depth: 1 ensures image is populated as Image, not number
    artists = (result?.docs as Artist[]) || []
  } catch (e) {
    console.error('Error loading artists:', e)
    error = 'Failed to load artists.'
  }

  // Extract unique instruments for filter tabs
  const instruments = artists ? Array.from(new Set(artists.flatMap((artist) => artist.instrument || []))) : []

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-8 text-5xl font-bold sm:mb-12 sm:text-6xl lg:text-7xl">{t('title')}</h1>
      {error && <div className="text-primary-error">{error}</div>}
      {!error && artists && artists.length === 0 && <div className="text-gray-500">No artists found.</div>}
      {!error && artists && artists.length > 0 && <ArtistGrid artists={artists} instruments={instruments} />}
    </main>
  )
}

export default ArtistsPage
