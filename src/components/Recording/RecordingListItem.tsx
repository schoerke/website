'use client'

import type { Recording } from '@/payload-types'
import { useTranslations } from 'next-intl'

interface RecordingListItemProps {
  recording: Recording
}

/**
 * A single recording entry rendered as a <li> element.
 * Displays title, optional subtitle (label, catalog number, year), and streaming links.
 *
 * Must be used inside a list container such as RecordingList (<ul>).
 */
const RecordingListItem: React.FC<RecordingListItemProps> = ({ recording }) => {
  const t = useTranslations('custom.pages.artist.discography')

  const label = recording.recordingLabel
  const catalogNumber = recording.catalogNumber
  const year = recording.recordingYear?.toString()
  const subtitle = [label, catalogNumber, year].filter(Boolean).join(' • ')

  return (
    <li className="border-b border-gray-200 py-3 last:border-b-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        {/* Title + subtitle */}
        <div>
          <h3 className="font-playfair mb-1 text-lg font-bold">{recording.title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* Streaming links — left-aligned on small, right-aligned on md+ */}
        {(recording.spotifyURL || recording.appleMusicURL) && (
          <div className="flex gap-4">
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
    </li>
  )
}

export default RecordingListItem
