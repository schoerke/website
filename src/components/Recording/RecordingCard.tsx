'use client'

import { publicEnv } from '@/config/env'
import type { Artist, Media } from '@/payload-types'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

interface RecordingCardProps {
  recording: any // Recording type from payload-types
}

function getImageUrl(img: Media | number | null | undefined): string {
  if (!img) return '/placeholder.jpg'
  if (typeof img === 'number') return '/placeholder.jpg'
  if (img.url && img.url.startsWith('http')) return img.url
  if (img.filename) return `${publicEnv.r2PublicEndpoint}/${img.filename}`
  return '/placeholder.jpg'
}

const RecordingCard: React.FC<RecordingCardProps> = ({ recording }) => {
  const t = useTranslations('custom.recordingRoles')

  const imageUrl = getImageUrl(recording.coverArt)

  // Format recording details
  const recordingDetails = [recording.recordingLabel, recording.catalogNumber, recording.recordingYear?.toString()]
    .filter(Boolean)
    .join(' • ')

  // Get artist names with roles
  const artistsWithRoles = recording.artistRoles
    .map((ar: any) => {
      const artist = typeof ar.artist === 'object' ? (ar.artist as Artist) : null
      if (!artist) return null

      const roles = ar.role?.map((r: string) => t(r as any)).join(', ') || ''
      return roles ? `${artist.name} (${roles})` : artist.name
    })
    .filter(Boolean)
    .join(', ')

  return (
    <div className="group overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]">
      <div className="relative h-72 w-full">
        <Image
          src={imageUrl}
          alt={recording.title || 'Recording cover'}
          width={400}
          height={400}
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>
      <div className="p-6">
        <h3 className="font-playfair mb-2 text-xl font-bold">{recording.title}</h3>
        {artistsWithRoles && <p className="mb-2 text-xs text-gray-600">{artistsWithRoles}</p>}
        {recordingDetails && <p className="text-xs text-gray-500">{recordingDetails}</p>}
      </div>
    </div>
  )
}

export default RecordingCard
