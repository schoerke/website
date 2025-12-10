'use client'

import { Link } from '@/i18n/navigation'
import type { Image as PayloadImage } from '@/payload-types'
import { getValidImageUrl, isImageObject } from '@/utils/image'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

interface ArtistCardProps {
  id: string
  name: string
  instrument?: string[]
  image?: number | null | PayloadImage
  slug?: string
}

const ArtistCard: React.FC<ArtistCardProps> = ({ name, instrument, image, slug }) => {
  const t = useTranslations('custom.instruments')

  // Get image URL with fallback to default avatar
  const imageUrl = getValidImageUrl(image)

  // Get focal point for better crop positioning (only if image is an object)
  const img = isImageObject(image) ? image : null
  const focalX = img?.focalX ?? 50
  const focalY = img?.focalY ?? 50

  // Handle image loading errors by falling back to default avatar
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/assets/default-avatar.webp'
  }

  // Translate instruments
  const translatedInstruments = instrument?.map((inst) => t(inst as Parameters<typeof t>[0])).join(', ') ?? ''

  return slug ? (
    <Link
      href={{ pathname: '/artists/[slug]', params: { slug } }}
      className="group block overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]"
    >
      <div className="relative h-72 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          onError={handleImageError}
        />
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
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          onError={handleImageError}
        />
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
