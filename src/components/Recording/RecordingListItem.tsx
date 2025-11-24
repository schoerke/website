'use client'

interface RecordingListItemProps {
  recording: any // Recording type from payload-types
}

const RecordingListItem: React.FC<RecordingListItemProps> = ({ recording }) => {
  // Format label number • year
  const labelNumber = recording.catalogNumber
  const year = recording.recordingYear?.toString()
  const subtitle = [labelNumber, year].filter(Boolean).join(' • ')

  return (
    <li className="border-b border-gray-200 py-4 last:border-b-0">
      <h3 className="font-playfair mb-1 text-lg font-bold">{recording.title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </li>
  )
}

export default RecordingListItem
