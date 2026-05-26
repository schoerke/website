'use client'

import { getAudioEmbedData, getAudioEmbedHeight } from '@/utils/audioEmbed'

interface AudioEmbedProps {
  url: string
}

const AudioEmbed: React.FC<AudioEmbedProps> = ({ url }) => {
  const embedData = getAudioEmbedData(url)

  if (!embedData) {
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[AudioEmbed] Invalid URL:', url)
    }

    return (
      <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
        <p className="mb-2 font-semibold text-red-900">Audio embed error</p>
        <p className="text-sm text-red-800">Unable to generate embed for: {url}</p>
      </div>
    )
  }

  const height = getAudioEmbedHeight(embedData.contentType)

  return (
    <div className="my-8">
      <div className="overflow-hidden rounded-lg bg-gray-100">
        <iframe
          src={embedData.embedUrl}
          title={`${embedData.platform === 'spotify' ? 'Spotify' : 'Apple Music'} ${embedData.contentType} player`}
          width="100%"
          height={height}
          frameBorder="0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ borderRadius: '12px' }}
        />
      </div>
    </div>
  )
}

export default AudioEmbed
