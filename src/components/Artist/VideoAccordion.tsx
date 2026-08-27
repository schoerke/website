'use client'

import { useState } from 'react'

import VideoEmbed from '@/components/blocks/VideoEmbed'
import { getVideoEmbedData } from '@/utils/videoEmbed'

interface VideoLink {
  label: string
  url?: string | null
  embedCode?: string | null
  id?: string | null
}

interface VideoAccordionProps {
  videos: VideoLink[]
  emptyMessage: string
}

/**
 * A video is renderable when it has an embed code OR a URL that
 * getVideoEmbedData can turn into an embed. This intentionally rejects bare
 * 11-character IDs (legacy-only input) because VideoEmbed cannot render them.
 */
function isRenderable(video: VideoLink): boolean {
  return Boolean(video.embedCode) || getVideoEmbedData(video.url ?? '') !== null
}

const VideoAccordion: React.FC<VideoAccordionProps> = ({ videos, emptyMessage }) => {
  const firstValidIndex = videos.findIndex(isRenderable)
  const [openIndex, setOpenIndex] = useState<number | null>(firstValidIndex >= 0 ? firstValidIndex : null)
  const [mountedIndices, setMountedIndices] = useState<Set<number>>(
    () => new Set(firstValidIndex >= 0 ? [firstValidIndex] : [])
  )

  if (videos.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const toggleAccordion = (index: number) => {
    const next = openIndex === index ? null : index
    setOpenIndex(next)
    if (next !== null) setMountedIndices((prev) => new Set(prev).add(next))
  }

  return (
    <ul className="space-y-0">
      {videos.map((video, index) => {
        const isOpen = openIndex === index
        const panelId = `video-panel-${video.id || index}`

        if (!isRenderable(video)) {
          console.warn(`Unsupported video URL: ${video.url}`)
          return null
        }

        return (
          <li key={video.id || index} className="border-b border-gray-200 last:border-b-0">
            <button
              onClick={() => toggleAccordion(index)}
              className="flex w-full items-center justify-between py-3 text-left"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="font-playfair text-lg font-bold">{video.label}</span>
              <svg
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              id={panelId}
              className="pb-4"
              style={!isOpen ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' } : undefined}
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                {mountedIndices.has(index) && (
                  <VideoEmbed
                    url={video.url ?? ''}
                    embedCode={video.embedCode ?? undefined}
                    title={video.label}
                    noMargin
                  />
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default VideoAccordion
