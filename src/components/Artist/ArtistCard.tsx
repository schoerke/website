'use client'

import { Link } from '@/i18n/navigation'
import type { Image as PayloadImage } from '@/payload-types'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

interface ArtistCardProps {
  id: string
  name: string
  instrument?: string[]
  image?: number | null | PayloadImage
  slug?: string
}

function getImageUrl(img: PayloadImage | null | undefined): string {
  if (!img?.url || img.url === 'null' || img.url.includes('/null')) return '/placeholder.jpg'
  return img.url
}

const ArtistCard: React.FC<ArtistCardProps> = ({ name, instrument, image, slug }) => {
  const t = useTranslations('custom.instruments')

  // If image is a number or null, treat as missing
  const img = typeof image === 'object' && image !== null ? (image as PayloadImage) : null
  const imageUrl = getImageUrl(img)

  // Translate instruments
  const translatedInstruments = instrument?.map((inst) => t(inst as any)).join(', ') ?? ''

  return slug ? (
    <Link
      href={`/artists/${slug}` as any}
      className="group block overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]"
    >
      <div className="relative h-72 w-full">
        <Image
          src={imageUrl}
          alt={name}
          width={400}
          height={400}
          className="h-full w-full object-cover"
          priority={false}
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
      <div className="relative h-72 w-full">
        <Image
          src={imageUrl}
          alt={name}
          width={400}
          height={400}
          className="h-full w-full object-cover"
          priority={false}
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
