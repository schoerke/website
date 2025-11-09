'use client'

import ArtistCard from '@/components/Artist/ArtistCard'
import InstrumentFilter from '@/components/Artist/InstrumentFilter'
import { useState } from 'react'

type Artist = {
  id: string
  name: string
  image?: any
  instrument?: string[]
}

interface ArtistGridProps {
  artists: Artist[]
  instruments: string[]
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ artists, instruments }) => {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])

  // Show all artists if no instruments selected, else show artists with ANY selected instrument
  const filteredArtists =
    selectedInstruments.length === 0
      ? artists
      : artists.filter((artist) => artist.instrument?.some((inst) => selectedInstruments.includes(inst)))

  return (
    <div>
      <InstrumentFilter instruments={instruments} selected={selectedInstruments} onChange={setSelectedInstruments} />
      {filteredArtists.length === 0 ? (
        <div className="text-gray-500">No artists found for these instruments.</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtists.map((artist) => (
            <ArtistCard
              key={String(artist.id)}
              id={String(artist.id)}
              name={artist.name}
              image={artist.image}
              instrument={artist.instrument ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ArtistGrid
