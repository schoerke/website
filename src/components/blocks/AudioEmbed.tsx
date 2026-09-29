'use client'

import { getAudioEmbedData, getAudioEmbedHeight, parseIframeEmbed } from '@/utils/audioEmbed'
import { isEmbedHostAllowed } from '@/utils/embeds'

interface AudioEmbedProps {
  url?: string
  embedCode?: string
}

const AudioEmbed: React.FC<AudioEmbedProps> = ({ url, embedCode }) => {
  // Block was just inserted and neither field has been filled in yet - this
  // is expected (e.g. while editing in the live preview) and isn't an error.
  if (!url && !embedCode) {
    return null
  }

  if (embedCode) {
    const parsed = parseIframeEmbed(embedCode)

    if (!parsed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AudioEmbed] Invalid embed code:', embedCode)
      }

      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Audio embed error</p>
          <p className="text-sm text-red-800">Unable to generate embed from the provided code.</p>
        </div>
      )
    }

    let host: string
    try {
      host = new URL(parsed.src).hostname
    } catch {
      host = ''
    }

    // Defense-in-depth: only render allowlisted http(s) sources (validation also happens at save)
    if (!/^https?:\/\//i.test(parsed.src) || !isEmbedHostAllowed(host)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AudioEmbed] Unsafe embed src:', parsed.src)
      }
      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Audio embed error</p>
          <p className="text-sm text-red-800">Unable to generate embed from the provided code.</p>
        </div>
      )
    }

    return (
      <div className="my-8">
        <div className="overflow-hidden rounded-lg bg-gray-100">
          <iframe
            src={parsed.src}
            title={parsed.title ?? 'Audio player'}
            width="100%"
            height={parsed.height ?? 58}
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups"
            allow="autoplay; encrypted-media"
            loading="lazy"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>
    )
  }

  const embedData = getAudioEmbedData(url ?? '')

  if (!embedData) {
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
