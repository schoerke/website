'use client'

import { Link } from '@/i18n/navigation'
import type { Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl, isImageObject } from '@/utils/image'
import { UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'

interface ArtistCardProps {
  id: string
  name: string
  instrument?: string[]
  image?: number | null | PayloadImage
  slug?: string
}

interface ArtistCardImageProps {
  image?: number | null | PayloadImage
  name: string
}

const ArtistCardImage: React.FC<ArtistCardImageProps> = ({ image, name }) => {
  const [imageFailed, setImageFailed] = useState(false)

  // Get image URL — null/undefined/unpopulated-ID/invalid-url all resolve to null
  const imageUrl = getValidImageUrl(image)
  const hasRealImage = imageUrl !== null

  // Get focal point for better crop positioning (only if image is an object)
  const img = isImageObject(image) ? image : null
  const focalX = img?.focalX ?? 50
  const focalY = img?.focalY ?? 50

  const showPlaceholder = !hasRealImage || imageFailed

  if (showPlaceholder) {
    return (
      <div
        data-testid="artist-image-placeholder"
        aria-hidden="true"
        className="flex h-full w-full items-center justify-center"
      >
        <UserRound className="h-24 w-24 text-gray-300" />
      </div>
    )
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      className="object-cover"
      style={{ objectPosition: `${focalX}% ${focalY}%` }}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
      onError={() => setImageFailed(true)}
      data-testid="artist-image"
    />
  )
}

const ArtistCard: React.FC<ArtistCardProps> = ({ name, instrument, image, slug }) => {
  const t = useTranslations('custom.instruments')

  // Translate instruments
  const translatedInstruments = instrument?.map((inst) => t(inst as Parameters<typeof t>[0])).join(', ') ?? ''

  return slug ? (
    <Link
      href={{ pathname: '/artists/[slug]', params: { slug } }}
      className="group block overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]"
    >
      <div className="relative h-72 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
        <ArtistCardImage image={image} name={name} />
        <div className="absolute inset-0 bg-white/10 transition-opacity duration-300 group-hover:opacity-0"></div>
      </div>
      <div className="p-6">
        <h3 className="font-playfair mb-1 text-xl font-bold">{name}</h3>
        <p className="text-sm text-gray-700">{translatedInstruments}</p>
      </div>
    </Link>
  ) : (
    <div className="group overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]">
      <div className="relative h-72 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
        <ArtistCardImage image={image} name={name} />
        <div className="absolute inset-0 bg-white/10 transition-opacity duration-300 group-hover:opacity-0"></div>
      </div>
      <div className="p-6">
        <h3 className="font-playfair mb-1 text-xl font-bold">{name}</h3>
        <p className="text-sm text-gray-700">{translatedInstruments}</p>
      </div>
    </div>
  )
}

export default ArtistCard
