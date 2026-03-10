'use client'

import { Link } from '@/i18n/navigation'
import type { Artist, Image as PayloadImage } from '@/payload-types'
import { shuffleArray } from '@/utils/array'
import { getValidImageUrl, isImageObject } from '@/utils/image'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface ArtistMasonryGridProps {
  artists: Artist[]
}

interface MasonryItemProps {
  artist: Artist
  translatedInstruments: string
}

const MasonryItem: React.FC<MasonryItemProps> = ({ artist, translatedInstruments }) => {
  const image = isImageObject(artist.image) ? (artist.image as PayloadImage) : null
  const imageUrl = getValidImageUrl(artist.image)
  const focalX = image?.focalX ?? 50
  const focalY = image?.focalY ?? 50

  const content = (
    <div className="group relative w-full overflow-hidden">
      <Image
        src={imageUrl}
        alt={artist.name}
        width={600}
        height={800}
        className="block h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={{ objectPosition: `${focalX}% ${focalY}%` }}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-4 transition-all duration-300 group-hover:bg-black/60">
        <div className="translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="font-playfair text-lg font-bold text-white drop-shadow">{artist.name}</p>
          {translatedInstruments && <p className="mt-0.5 text-sm text-white/80 drop-shadow">{translatedInstruments}</p>}
        </div>
      </div>
    </div>
  )

  if (!artist.slug) return <div className="mb-1 break-inside-avoid">{content}</div>

  return (
    <Link
      href={{ pathname: '/artists/[slug]', params: { slug: artist.slug } }}
      className="mb-1 block break-inside-avoid"
      aria-label={artist.name}
    >
      {content}
    </Link>
  )
}

const ArtistMasonryGrid: React.FC<ArtistMasonryGridProps> = ({ artists }) => {
  const t = useTranslations('custom.instruments')
  const [displayed, setDisplayed] = useState(artists)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDisplayed(shuffleArray(artists))
    setReady(true)
  }, [artists])

  return (
    <div
      className="columns-1 gap-1 sm:columns-2 lg:columns-3"
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
    >
      {displayed.map((artist) => {
        const translatedInstruments =
          artist.instrument?.map((inst) => t(inst as Parameters<typeof t>[0])).join(', ') ?? ''

        return <MasonryItem key={String(artist.id)} artist={artist} translatedInstruments={translatedInstruments} />
      })}
    </div>
  )
}

export default ArtistMasonryGrid
