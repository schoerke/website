import type { Media } from '@/payload-types'
import Image from 'next/image'

interface ArtistCardProps {
  id: string
  name: string
  instrument?: string[]
  image?: number | null | Media
}

const R2_PUBLIC_ENDPOINT = process.env.NEXT_PUBLIC_S3_HOSTNAME

function getImageUrl(img: Media | null | undefined): string {
  if (!img) return '/placeholder.jpg'
  if (img.url && img.url.startsWith('http')) return img.url
  if (img.filename) return `${R2_PUBLIC_ENDPOINT}/${img.filename}`
  return '/placeholder.jpg'
}

const ArtistCard: React.FC<ArtistCardProps> = ({ name, instrument, image }) => {
  // If image is a number or null, treat as missing
  const img = typeof image === 'object' && image !== null ? (image as Media) : null
  const imageUrl = getImageUrl(img)

  return (
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
        <h3 className="font-playfair mb-2 text-2xl font-bold">{name}</h3>
        <p className="text-sm text-gray-700">{instrument?.join(', ') ?? ''}</p>
      </div>
    </div>
  )
}

export default ArtistCard;

