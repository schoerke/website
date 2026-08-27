'use client'

import { useState } from 'react'

import VideoEmbed from '@/components/blocks/VideoEmbed'
import { extractYouTubeVideoId } from '@/utils/videoEmbed'

interface VideoLink {
  label: string
  url: string
  embedCode?: string | null
  id?: string | null
}

interface VideoAccordionProps {
  videos: VideoLink[]
  emptyMessage: string
}

/**
 * Extract YouTube video ID from a URL or a bare 11-character ID.
 * URL formats handled by the shared extractYouTubeVideoId util.
 */
function extractYouTubeId(url: string): string | null {
  const id = extractYouTubeVideoId(url)
  if (id) return id
  return /^[a-zA-Z0-9_-]{11}$/.test(url) ? url : null
}

/**
 * Parse an arte.tv watch URL, returning the locale and video ID.
 * - https://www.arte.tv/de/videos/120894-000-A/some-title/
 */
function parseArteUrl(url: string): { locale: string; id: string } | null {
  try {
    const parsed = new URL(url)
    const isArteDomain = parsed.hostname === 'www.arte.tv' || parsed.hostname === 'arte.tv'
    if (!isArteDomain) return null

    const match = parsed.pathname.match(/^\/([a-z]{2})\/videos\/([^/]+)/)
    if (!match) return null
    return { locale: match[1], id: match[2] }
  } catch {
    return null
  }
}

/**
 * Build the embed iframe src for a video URL.
 * For arte.tv, the locale is extracted from the watch URL itself.
 * Returns null if the URL is not a supported platform.
 */
function buildEmbedSrc(url: string): string | null {
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`
  }

  const arte = parseArteUrl(url)
  if (arte) {
    return `https://www.arte.tv/embeds/${arte.locale}/${arte.id}?autoplay=false`
  }

  return null
}

/**
 * A video is renderable when it has an embed code OR a URL that maps to a
 * supported platform (YouTube/arte.tv). Rendering itself is delegated to
 * <VideoEmbed>.
 */
function isRenderable(video: VideoLink): boolean {
  return Boolean(video.embedCode) || buildEmbedSrc(video.url) !== null
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
                {mountedIndices.has(index) && <VideoEmbed url={video.url} embedCode={video.embedCode ?? undefined} />}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default VideoAccordion
