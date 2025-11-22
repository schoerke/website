'use client'

import RecordingCard from '@/components/Recording/RecordingCard'

interface RecordingGridProps {
  recordings: any[] // Recording[] from payload-types
}

const RecordingGrid: React.FC<RecordingGridProps> = ({ recordings }) => {
  if (recordings.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recordings.map((recording) => (
        <RecordingCard key={recording.id} recording={recording} />
      ))}
    </div>
  )
}

export default RecordingGrid
