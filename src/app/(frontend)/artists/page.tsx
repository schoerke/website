import ArtistGrid from '@/components/Artist/ArtistGrid'
import ImageSlider from '@/components/ui/ImageSlider'
import config from '@/payload.config'
import { getArtistListData } from '@/services/artist'
import { getPayload } from 'payload'

const ArtistsPage = async () => {
  let artists = null
  let error = null

  try {
    const payload = await getPayload({ config })
    const result = await getArtistListData(payload)
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
    (artists || []).map((artist: any) => {
      const sizes = artist.image?.sizes || {}
      const src = sizes.hero?.url || sizes.card?.url || sizes.thumbnail?.url || artist.image?.url || '/placeholder.jpg'
      return {
        src,
        alt: artist.name,
        bannerText: artist.name,
        link: artist.slug ? `/artists/${artist.slug}` : undefined,
        sizesAttr: '(max-width: 768px) 100vw, 1200px',
      }
    }),
  )

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">Artists</h1>
      {error && <div className="text-red-600">{error}</div>}
      {!error && artists && artists.length > 0 && (
        <div className="mb-12">
          <ImageSlider images={sliderImages} autoAdvance interval={6000} showArrows={false} showDots />
        </div>
      )}
      {!error && artists && artists.length === 0 && <div className="text-gray-500">No artists found.</div>}
      {!error && artists && artists.length > 0 && (
        <ArtistGrid artists={artists.map((a: any) => ({ ...a, id: String(a.id) }))} instruments={instruments} />
      )}
    </main>
  )
}

export default ArtistsPage
