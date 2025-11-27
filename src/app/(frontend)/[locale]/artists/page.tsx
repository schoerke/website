import ArtistGrid from '@/components/Artist/ArtistGrid'
import ImageSlider from '@/components/ui/ImageSlider'
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

  // Prepare images for the slider and randomize their order
  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const sliderImages = shuffleArray(
    (artists || [])
      .filter((artist: any) => {
        // Only include artists with valid image URLs
        if (!artist.image || typeof artist.image !== 'object') return false

        const sizes = artist.image.sizes || {}
        const mainUrl = artist.image.url

        // Check if any URL is valid (not null, not "null" string, not empty)
        const hasValidUrl = [sizes.hero?.url, sizes.card?.url, sizes.thumbnail?.url, mainUrl].some(
          (url) => url && url !== 'null' && !url.includes('/null') && url !== '',
        )

        return hasValidUrl
      })
      .map((artist: any) => {
        const sizes = artist.image?.sizes || {}
        // Get the first available non-null, non-empty URL
        const src =
          (sizes.hero?.url && sizes.hero.url !== 'null' ? sizes.hero.url : null) ||
          (sizes.card?.url && sizes.card.url !== 'null' ? sizes.card.url : null) ||
          (sizes.thumbnail?.url && sizes.thumbnail.url !== 'null' ? sizes.thumbnail.url : null) ||
          (artist.image?.url && artist.image.url !== 'null' ? artist.image.url : null) ||
          '/placeholder.jpg'

        return {
          src,
          alt: artist.name,
          bannerText: artist.name,
          link: artist.slug ? `/artists/${artist.slug}` : undefined,
          sizesAttr: '(max-width: 768px) 100vw, 50vw',
        }
      }),
  )

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{t('title')}</h1>
      {error && <div className="text-red-600">{error}</div>}
      {!error && artists && artists.length === 0 && <div className="text-gray-500">No artists found.</div>}
      {!error && artists && artists.length > 0 && (
        <>
          <ArtistGrid artists={artists.map((a: any) => ({ ...a, id: String(a.id) }))} instruments={instruments} />
          <div className="mt-16">
            <h2 className="font-playfair mb-6 text-3xl font-bold">Discover More Artists</h2>
            <ImageSlider images={sliderImages} autoAdvance interval={6000} showArrows={false} showDots />
          </div>
        </>
      )}
    </main>
  )
}

export default ArtistsPage
