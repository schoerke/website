'use client'

import { Link } from '@/i18n/navigation'
import type { Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl, isImageObject } from '@/utils/image'
import { UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'

interface ArtistCardProps {
  name: string
  instrument?: string[]
  image?: number | null | PayloadImage
  slug?: string
  hoverDisabled?: boolean
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

const ArtistCard: React.FC<ArtistCardProps> = ({ name, instrument, image, slug, hoverDisabled = false }) => {
  const t = useTranslations('custom.instruments')

  // Translate instruments
  const translatedInstruments = instrument?.map((inst) => t(inst as Parameters<typeof t>[0])).join(', ') ?? ''

  const scrimClasses = hoverDisabled
    ? 'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 transition-colors duration-300'
    : 'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 transition-colors duration-300 group-hover:from-black/85 group-hover:via-black/40'
  const cardClasses = 'group relative block aspect-square w-full overflow-hidden rounded bg-gray-100 shadow-md'

  const overlay = (
    <div className={scrimClasses}>
      <p className="font-playfair text-2xl font-bold italic text-white drop-shadow">{name}</p>
      {translatedInstruments && (
        <p className="text-primary-yellow mt-0.5 text-sm drop-shadow">{translatedInstruments}</p>
      )}
    </div>
  )

  return slug ? (
    <Link href={{ pathname: '/artists/[slug]', params: { slug } }} className={cardClasses}>
      <ArtistCardImage image={image} name={name} />
      {overlay}
    </Link>
  ) : (
    <div className={cardClasses}>
      <ArtistCardImage image={image} name={name} />
      {overlay}
    </div>
  )
}

export default ArtistCard
