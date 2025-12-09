'use client'

import type { Recording } from '@/payload-types'

interface RecordingListItemProps {
  recording: Recording
}

const RecordingListItem: React.FC<RecordingListItemProps> = ({ recording }) => {
  // Format label • catalog number • year
  const label = recording.recordingLabel
  const catalogNumber = recording.catalogNumber
  const year = recording.recordingYear?.toString()
  const subtitle = [label, catalogNumber, year].filter(Boolean).join(' • ')

  return (
    <li className="border-b border-gray-200 py-4 last:border-b-0">
      <h3 className="font-playfair mb-1 text-lg font-bold">{recording.title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </li>
  )
}

export default RecordingListItem
