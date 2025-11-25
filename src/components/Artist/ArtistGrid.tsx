'use client'

import ArtistCard from '@/components/Artist/ArtistCard'
import InstrumentFilter from '@/components/Artist/InstrumentFilter'
import { useState } from 'react'

type Artist = {
  id: string
  name: string
  image?: any
  instrument?: string[]
  slug?: string
}

interface ArtistGridProps {
  artists: Artist[]
  instruments: string[]
}

// Define instrument category priority using the database keys (lowercase)
const INSTRUMENT_PRIORITY: { [key: string]: number } = {
  conductor: 1,
  piano: 2,
  'piano-forte': 2, // Same priority as piano
  violin: 3,
  cello: 4,
  viola: 5,
  bass: 6,
  // All other instruments (winds, chamber music, etc.) get category 7
}

/**
 * Get the highest priority (lowest number) for an artist's instruments
 */
function getArtistPriority(artist: Artist): number {
  if (!artist.instrument || artist.instrument.length === 0) {
    return 999 // Artists with no instrument go last
  }

  const priorities = artist.instrument
    .map((inst) => INSTRUMENT_PRIORITY[inst] ?? 7) // Default to 7 for winds and others
    .filter((p) => p !== undefined)

  return priorities.length > 0 ? Math.min(...priorities) : 999
}

/**
 * Extract last name from full name for sorting
 * Assumes "First Last" or "First Middle Last" format
 */
function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

/**
 * Sort artists by instrument priority, then alphabetically by last name
 */
function sortArtists(artists: Artist[]): Artist[] {
  return [...artists].sort((a, b) => {
    const priorityA = getArtistPriority(a)
    const priorityB = getArtistPriority(b)

    // First sort by instrument priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Then sort alphabetically by last name
    const lastNameA = getLastName(a.name)
    const lastNameB = getLastName(b.name)
    return lastNameA.localeCompare(lastNameB)
  })
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ artists, instruments }) => {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])

  // Show all artists if no instruments selected, else show artists with ANY selected instrument
  const filteredArtists =
    selectedInstruments.length === 0
      ? artists
      : artists.filter((artist) => artist.instrument?.some((inst) => selectedInstruments.includes(inst)))

  // Sort the filtered artists
  const sortedArtists = sortArtists(filteredArtists)

  return (
    <div>
      <InstrumentFilter instruments={instruments} selected={selectedInstruments} onChange={setSelectedInstruments} />
      {sortedArtists.length === 0 ? (
        <div className="text-gray-500">No artists found for these instruments.</div>
      ) : (
        <div
          key={selectedInstruments.join(',')}
          className="animate-in fade-in mt-8 grid grid-cols-1 gap-6 duration-500 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {sortedArtists.map((artist) => (
            <ArtistCard
              key={String(artist.id)}
              id={String(artist.id)}
              name={artist.name}
              image={artist.image}
              instrument={artist.instrument ?? []}
              slug={artist.slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ArtistGrid
