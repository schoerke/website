'use client'

import ArtistCard from '@/components/Artist/ArtistCard'
import { INSTRUMENT_PRIORITY } from '@/components/Artist/artistConstants'
import InstrumentFilter from '@/components/Artist/InstrumentFilter'
import ImageSlider from '@/components/ui/ImageSlider'
import { useDisableHoverOnScroll } from '@/hooks/useDisableHoverOnScroll'
import type { Artist } from '@/payload-types'
import { shuffleArray } from '@/utils/array'
import { isImageObject, isValidUrl } from '@/utils/image'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

interface ArtistGridProps {
  artists: Artist[]
  instruments: string[]
}

/**
 * Get the highest priority (lowest number) for an artist's instruments
 */
function getArtistPriority(artist: Artist): number {
  if (!artist.instrument || artist.instrument.length === 0) {
    return 999 // Artists with no instrument go last
  }

  const priorities = artist.instrument.map((inst) => INSTRUMENT_PRIORITY[inst] ?? 9) // Default to 9 for unknown instruments

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
 * Determine the name used for alphabetical sorting.
 * Chamber ensembles sort by their ensemble name (first word onwards),
 * all other artists sort by last name.
 */
function getSortName(artist: Artist): string {
  if (artist.instrument?.includes('chamber-music')) {
    return artist.name.trim()
  }
  return getLastName(artist.name)
}

/**
 * Sort artists by instrument priority, then alphabetically within each group
 */
function sortArtists(artists: Artist[]): Artist[] {
  return [...artists].sort((a, b) => {
    const priorityA = getArtistPriority(a)
    const priorityB = getArtistPriority(b)

    // First sort by instrument priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Then sort alphabetically (last name for soloists, ensemble name for chamber groups)
    return getSortName(a).localeCompare(getSortName(b))
  })
}

const ArtistGrid: React.FC<ArtistGridProps> = ({ artists, instruments }) => {
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const t = useTranslations('custom.pages.artists')
  const tInstruments = useTranslations('custom.instruments')
  const hoverDisabled = useDisableHoverOnScroll()

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
    [shuffledArtists, displayedArtistIds]
  )

  // Only show slider if there are artists not shown in the grid
  const showSlider = sliderArtists.length > 0

  const sliderImages = useMemo(() => {
    if (!showSlider) return []

    return sliderArtists
      .map((artist) => {
        // Type guard: ensure image is a valid Image object, not a number or null
        const image = isImageObject(artist.image) ? artist.image : null
        if (!image) return null
        const imageUrl = image.url
        if (!isValidUrl(imageUrl)) return null

        const translatedInstruments =
          artist.instrument?.map((inst) => tInstruments(inst as Parameters<typeof tInstruments>[0])).join(', ') ?? ''

        return {
          src: imageUrl,
          alt: artist.name,
          bannerText: artist.name,
          instruments: translatedInstruments || undefined,
          slug: artist.slug || undefined,
          sizesAttr: '(max-width: 768px) 100vw, 50vw',
          focalX: image?.focalX ?? null,
          focalY: image?.focalY ?? null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [showSlider, sliderArtists, tInstruments])

  return (
    <>
      <div>
        <InstrumentFilter instruments={instruments} selected={selectedInstruments} onChange={setSelectedInstruments} />
        {sortedArtists.length === 0 ? (
          <div className="text-gray-500">{t('noArtistsForInstruments')}</div>
        ) : (
          <div
            key={selectedInstruments.join(',')}
            className="animate-in fade-in mt-8 grid grid-cols-1 gap-2 duration-500 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {sortedArtists.map((artist) => (
              <ArtistCard
                key={String(artist.id)}
                name={artist.name}
                image={artist.image}
                instrument={artist.instrument ?? []}
                slug={artist.slug}
                hoverDisabled={hoverDisabled}
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
