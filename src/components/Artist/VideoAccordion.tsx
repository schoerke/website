'use client'

import { useState } from 'react'

interface YouTubeLink {
  label: string
  url: string
  id?: string | null
}

interface VideoAccordionProps {
  videos: YouTubeLink[]
  emptyMessage: string
}

/**
 * Extract YouTube video ID from various URL formats
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

const VideoAccordion: React.FC<VideoAccordionProps> = ({ videos, emptyMessage }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
    <div className="space-y-4">
      {videos.map((video, index) => {
        const videoId = extractYouTubeId(video.url)
        const isOpen = openIndex === index

        if (!videoId) {
          console.warn(`Invalid YouTube URL: ${video.url}`)
          return null
        }

        return (
          <div key={video.id || index} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => toggleAccordion(index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-gray-900">{video.label}</span>
              <svg
                className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-gray-200 p-6">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={video.label}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default VideoAccordion
