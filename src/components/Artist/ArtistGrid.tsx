'use client'

import ArtistCard from '@/components/Artist/ArtistCard'
import InstrumentFilter from '@/components/Artist/InstrumentFilter'
import ImageSlider from '@/components/ui/ImageSlider'
import type { Artist, Image } from '@/payload-types'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

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

/**
 * Randomize array order
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Check if a URL string is valid (not null, not empty, not the string "null")
 */
function isValidUrl(url: unknown): url is string {
  return typeof url === 'string' && url !== '' && url !== 'null' && !url.includes('/null')
}

/**
 * Get the first valid image URL from a Payload image object
 * Prioritizes: tablet -> original -> card -> thumbnail
 */
function getValidImageUrl(image: Image | null | undefined): string | null {
  if (!image) return null

  const sizes = image.sizes

  // Check available sizes in priority order
  if (sizes?.tablet?.url && isValidUrl(sizes.tablet.url)) return sizes.tablet.url
  if (image.url && isValidUrl(image.url)) return image.url
  if (sizes?.card?.url && isValidUrl(sizes.card.url)) return sizes.card.url
  if (sizes?.thumbnail?.url && isValidUrl(sizes.thumbnail.url)) return sizes.thumbnail.url

  return null
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ artists, instruments }) => {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const t = useTranslations('custom.pages.artists')

  // Shuffle artists once on mount for stable slider order
  const [shuffledArtists] = useState(() => shuffleArray([...artists]))

  // Show all artists if no instruments selected, else show artists with ANY selected instrument
  const filteredArtists =
    selectedInstruments.length === 0
      ? artists
      : artists.filter((artist) => artist.instrument?.some((inst) => selectedInstruments.includes(inst)))

  // Sort the filtered artists
  const sortedArtists = sortArtists(filteredArtists)

  // Get IDs of displayed artists
  const displayedArtistIds = useMemo(() => new Set(sortedArtists.map((a) => a.id)), [sortedArtists])

  // Filter slider images from the pre-shuffled list to exclude artists shown in grid
  const sliderArtists = useMemo(
    () => shuffledArtists.filter((artist) => !displayedArtistIds.has(artist.id)),
    [shuffledArtists, displayedArtistIds],
  )

  // Only show slider if there are artists not shown in the grid
  const showSlider = sliderArtists.length > 0

  const sliderImages = useMemo(() => {
    if (!showSlider) return []

    return sliderArtists
      .map((artist) => {
        // Type guard: ensure image is an Image object, not a number
        const image = typeof artist.image === 'object' ? artist.image : null
        const imageUrl = getValidImageUrl(image)
        if (!imageUrl) return null

        return {
          src: imageUrl,
          alt: artist.name,
          bannerText: artist.name,
          slug: artist.slug || undefined,
          sizesAttr: '(max-width: 768px) 100vw, 50vw',
          focalX: image?.focalX ?? null,
          focalY: image?.focalY ?? null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [showSlider, sliderArtists])

  return (
    <>
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
      {showSlider && (
        <div className="mt-16">
          <h2 className="font-playfair mb-6 text-3xl font-bold">{t('discoverMore')}</h2>
          <ImageSlider
            images={sliderImages}
            autoAdvance
            interval={6000}
            showArrows={false}
            showDots
            eagerLoadCount={2}
          />
        </div>
      )}
    </>
  )
}

export default ArtistGrid
