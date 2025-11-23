'use client'

import type { Artist } from '@/payload-types'
import { useTranslations } from 'next-intl'

interface RecordingCardProps {
  recording: any // Recording type from payload-types
}

const RecordingCard: React.FC<RecordingCardProps> = ({ recording }) => {
  const t = useTranslations('custom.recordingRoles')

  // Format recording details
  const recordingDetails = [recording.recordingLabel, recording.catalogNumber, recording.recordingYear?.toString()]
    .filter(Boolean)
    .join(' • ')

  // Get artist names with roles
  const artists = Array.isArray(recording.artists) ? recording.artists : []
  const roles = Array.isArray(recording.roles) ? recording.roles : []

  const artistNames = artists
    .map((a: any) => {
      const artist = typeof a === 'object' ? (a as Artist) : null
      return artist?.name || null
    })
    .filter(Boolean)
    .join(', ')

  const roleNames = roles.map((r: string) => t(r as any)).join(', ')
  const artistsWithRoles = roleNames ? `${artistNames} (${roleNames})` : artistNames

  return (
    <div className="group overflow-hidden rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-[1.02]">
      <h3 className="font-playfair mb-2 text-base font-bold">{recording.title}</h3>
      {artistsWithRoles && <p className="mb-2 text-sm text-gray-600">{artistsWithRoles}</p>}
      {recordingDetails && <p className="text-sm text-gray-500">{recordingDetails}</p>}
    </div>
  )
}

export default RecordingCard
