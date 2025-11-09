import ArtistGrid from '@/components/Artist/ArtistGrid'
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

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">Artists</h1>
      {error && <div className="text-red-600">{error}</div>}
      {!error && artists && artists.length === 0 && <div className="text-gray-500">No artists found.</div>}
      {!error && artists && artists.length > 0 && (
        <ArtistGrid artists={artists.map((a: any) => ({ ...a, id: String(a.id) }))} instruments={instruments} />
      )}
    </main>
  )
}

export default ArtistsPage
