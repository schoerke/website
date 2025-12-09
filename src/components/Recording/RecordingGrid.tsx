'use client'

import RecordingCard from '@/components/Recording/RecordingCard'
import type { Recording } from '@/payload-types'

interface RecordingGridProps {
  recordings: Recording[]
  filterKey?: string | null // Key to trigger re-animation when filter changes
}

const RecordingGrid: React.FC<RecordingGridProps> = ({ recordings, filterKey }) => {
  if (recordings.length === 0) {
    return null
  }

  return (
    <div
      key={filterKey ?? 'all'}
      className="animate-in fade-in grid grid-cols-1 gap-6 duration-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {recordings.map((recording) => (
        <RecordingCard key={recording.id} recording={recording} />
      ))}
    </div>
  )
}

export default RecordingGrid
