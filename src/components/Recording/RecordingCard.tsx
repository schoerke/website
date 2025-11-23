'use client'

interface RecordingCardProps {
  recording: any // Recording type from payload-types
}

const RecordingCard: React.FC<RecordingCardProps> = ({ recording }) => {
  // Format recording details - combine label and catalog, then add year
  const labelAndCatalog = [recording.recordingLabel, recording.catalogNumber].filter(Boolean).join(' ')
  const recordingDetails = [labelAndCatalog, recording.recordingYear?.toString()].filter(Boolean).join(' • ')

  return (
    <div className="group overflow-hidden rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-[1.02]">
      <h3 className="font-playfair mb-2 text-base font-bold">{recording.title}</h3>
      {recordingDetails && <p className="text-sm text-gray-500">{recordingDetails}</p>}
    </div>
  )
}

export default RecordingCard
