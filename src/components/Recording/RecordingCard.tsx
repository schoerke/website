'use client'

interface RecordingCardProps {
  recording: any // Recording type from payload-types
}

const RecordingCard: React.FC<RecordingCardProps> = ({ recording }) => {
  // Format label and catalog number
  const labelAndCatalog = [recording.recordingLabel, recording.catalogNumber].filter(Boolean).join(' ')
  const year = recording.recordingYear?.toString()

  return (
    <div className="group overflow-hidden rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-[1.02]">
      <h3 className="font-playfair mb-2 line-clamp-2 text-base font-bold">{recording.title}</h3>
      {(labelAndCatalog || year) && (
        <div className="flex justify-between text-sm text-gray-500">
          <span>{labelAndCatalog}</span>
          {year && <span>{year}</span>}
        </div>
      )}
    </div>
  )
}

export default RecordingCard
