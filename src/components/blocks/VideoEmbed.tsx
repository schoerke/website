'use client'

import { getAspectRatioPadding, getVideoEmbedData } from '@/utils/videoEmbed'

interface VideoEmbedProps {
  url: string
  aspectRatio?: '16:9' | '4:3' | '21:9'
  locale?: 'de' | 'en'
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url, aspectRatio = '16:9', locale }) => {
  const embedData = getVideoEmbedData(url, locale)

  if (!embedData) {
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[VideoEmbed] Invalid URL:', url)
    }

    return (
      <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
        <p className="mb-2 font-semibold text-red-900">Video embed error</p>
        <p className="text-sm text-red-800">Unable to generate embed for: {url}</p>
      </div>
    )
  }

  const paddingBottom = getAspectRatioPadding(aspectRatio)

  return (
    <div className="my-8">
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-900" style={{ paddingBottom: `${paddingBottom}%` }}>
        <iframe
          src={embedData.embedUrl}
          title={`${embedData.platform} video player`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute left-0 top-0 h-full w-full border-0"
        />
      </div>
    </div>
  )
}

export default VideoEmbed
