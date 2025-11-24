'use client'

import RecordingListItem from '@/components/Recording/RecordingListItem'

interface RecordingListProps {
  recordings: any[] // Recording[] from payload-types
  filterKey?: string | null // Key to trigger re-animation when filter changes
}

const RecordingList: React.FC<RecordingListProps> = ({ recordings, filterKey }) => {
  if (recordings.length === 0) {
    return null
  }

  return (
    <ul key={filterKey ?? 'all'} className="animate-in fade-in space-y-4 duration-300">
      {recordings.map((recording) => (
        <RecordingListItem key={recording.id} recording={recording} />
      ))}
    </ul>
  )
}

export default RecordingList
