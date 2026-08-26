'use client'

import type { Image as PayloadImage, Recording } from '@/payload-types'
import { SiApplemusic, SiSpotify } from '@icons-pack/react-simple-icons'
import { Disc as DiscIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import React, { useState } from 'react'

import RecordingDetailsDialog from '@/components/Recording/RecordingDetailsDialog'
import { getImageUrlForSize } from '@/utils/image'
import { hasVisibleTextContent } from '@/utils/lexical'

interface RecordingListItemProps {
  recording: Recording
}

/**
 * A single recording entry rendered as a <li> element.
 * Displays cover art (or a placeholder), title, a "label • year" subtitle with an inline
 * "More details" link (only when the recording has visible description text) that opens the
 * recording details modal, and streaming links.
 *
 * Must be used inside a list container such as RecordingList (<ul>).
 */
const RecordingListItem: React.FC<RecordingListItemProps> = ({ recording }) => {
  const t = useTranslations('custom.pages.artist.discography')
  const [imageFailed, setImageFailed] = useState(false)

  const coverArt =
    typeof recording.coverArt === 'object' && recording.coverArt !== null ? (recording.coverArt as PayloadImage) : null
  const coverArtUrl = getImageUrlForSize(coverArt, 'thumbnail')

  const metaItems = [recording.recordingLabel, recording.recordingYear?.toString()].filter((m): m is string =>
    Boolean(m)
  )
  const showMore = hasVisibleTextContent(recording.description ?? null)

  return (
    <li className="border-b border-gray-200 py-3 last:border-b-0">
      <div className="flex items-center gap-4">
        {/* Cover art thumbnail / placeholder — larger on mobile since streaming links wrap below the
            title there; shrinks back down on md+ where everything sits on one row. */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100 md:h-12 md:w-12">
          {coverArtUrl && !imageFailed ? (
            <Image
              src={coverArtUrl}
              alt={coverArt?.alt || recording.title}
              fill
              sizes="(min-width: 768px) 48px, 80px"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              data-testid="recording-cover-placeholder"
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center"
            >
              <DiscIcon className="h-8 w-8 text-gray-400 md:h-5 md:w-5" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          {/* Title + "label • year" subtitle with inline "More details" link */}
          <div>
            <h3 className="font-playfair mb-1 text-lg font-bold">{recording.title}</h3>
            {(metaItems.length > 0 || showMore) && (
              <p className="text-sm text-gray-500">
                {metaItems.join(' • ')}
                {showMore && metaItems.length > 0 && ' • '}
                {showMore && <RecordingDetailsDialog recording={recording} />}
              </p>
            )}
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
                  className="inline-flex items-center gap-2 text-gray-500 transition duration-150 ease-in-out hover:text-gray-900"
                >
                  <span className="hidden text-sm lg:inline">{t('listenOnSpotify')}</span>
                  <SiSpotify width={20} height={20} aria-hidden="true" />
                  <span className="sr-only"> ({t('opensInNewTab')})</span>
                </a>
              )}
              {recording.appleMusicURL && (
                <a
                  href={recording.appleMusicURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('listenOnAppleMusicFor', { title: recording.title })}
                  className="inline-flex items-center gap-2 text-gray-500 transition duration-150 ease-in-out hover:text-gray-900"
                >
                  <span className="hidden text-sm lg:inline">{t('listenOnAppleMusic')}</span>
                  <SiApplemusic width={20} height={20} aria-hidden="true" />
                  <span className="sr-only"> ({t('opensInNewTab')})</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default RecordingListItem
