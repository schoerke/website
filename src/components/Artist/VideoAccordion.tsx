'use client'

import { useState } from 'react'

interface VideoLink {
  label: string
  url: string
  id?: string | null
}

interface VideoAccordionProps {
  videos: VideoLink[]
  emptyMessage: string
  locale: string
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) return match[1]
  }

  return null
}

/**
 * Extract arte.tv video ID from watch URL:
 * - https://www.arte.tv/de/videos/120894-000-A/some-title/
 */
function extractArteId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const isArteDomain = parsed.hostname === 'www.arte.tv' || parsed.hostname === 'arte.tv'
    if (!isArteDomain) return null

    const match = parsed.pathname.match(/^\/[a-z]{2}\/videos\/([^/]+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Build the embed iframe src for a video URL.
 * Returns null if the URL is not a supported platform.
 */
function buildEmbedSrc(url: string, locale: string): string | null {
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`
  }

  const arteId = extractArteId(url)
  if (arteId) {
    return `https://www.arte.tv/embeds/${locale}/${arteId}`
  }

  return null
}

const VideoAccordion: React.FC<VideoAccordionProps> = ({ videos, emptyMessage, locale }) => {
  const firstValidIndex = videos.findIndex((v) => buildEmbedSrc(v.url, locale) !== null)
  const [openIndex, setOpenIndex] = useState<number | null>(firstValidIndex >= 0 ? firstValidIndex : null)

  if (videos.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <ul className="space-y-0">
      {videos.map((video, index) => {
        const embedSrc = buildEmbedSrc(video.url, locale)
        const isOpen = openIndex === index
        const panelId = `video-panel-${video.id || index}`

        if (!embedSrc) {
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
              <span className="font-playfair mb-1 text-lg font-bold">{video.label}</span>
              <svg
                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div id={panelId} hidden={!isOpen} className="pb-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  src={embedSrc}
                  title={video.label}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default VideoAccordion
