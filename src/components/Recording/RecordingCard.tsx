import type { Recording } from '@/payload-types'
import { getTranslations } from 'next-intl/server'

interface RecordingCardProps {
  recording: Recording
}

const RecordingCard = async ({ recording }: RecordingCardProps) => {
  const t = await getTranslations('custom.pages.artist.discography')

  const labelAndCatalog = [recording.recordingLabel, recording.catalogNumber].filter(Boolean).join(' • ')
  const year = recording.recordingYear?.toString()

  return (
    <div className="group overflow-hidden rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-[1.02]">
      <div className="flex items-start justify-between gap-4">
        {/* Title + metadata */}
        <div className="min-w-0 flex-1">
          <h3 className="font-playfair mb-2 line-clamp-2 text-base font-bold">{recording.title}</h3>
          {(labelAndCatalog || year) && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>{labelAndCatalog}</span>
              {year && <span>{year}</span>}
            </div>
          )}
        </div>

        {/* Streaming links */}
        {(recording.spotifyURL || recording.appleMusicURL) && (
          <div className="flex shrink-0 gap-4">
            {recording.spotifyURL && (
              <a
                href={recording.spotifyURL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('listenOnSpotifyFor', { title: recording.title })}
                className="text-xs text-gray-500 hover:text-gray-900 hover:underline"
              >
                {t('listenOnSpotify')}
                <span className="sr-only"> ({t('opensInNewTab')})</span>
              </a>
            )}
            {recording.appleMusicURL && (
              <a
                href={recording.appleMusicURL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('listenOnAppleMusicFor', { title: recording.title })}
                className="text-xs text-gray-500 hover:text-gray-900 hover:underline"
              >
                {t('listenOnAppleMusic')}
                <span className="sr-only"> ({t('opensInNewTab')})</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecordingCard
