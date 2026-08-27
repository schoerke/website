'use client'

import { parseIframeEmbed } from '@/utils/audioEmbed'
import { ALLOWED_EMBED_HOSTS, isEmbedHostAllowed } from '@/utils/embeds'
import { getAspectRatioPadding, getVideoEmbedData } from '@/utils/videoEmbed'

interface VideoEmbedProps {
  url?: string
  embedCode?: string
  aspectRatio?: '16:9' | '4:3' | '21:9'
  locale?: 'de' | 'en'
}

const VIDEO_EMBED_DEFAULT_HEIGHT = 315

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url, embedCode, aspectRatio = '16:9', locale }) => {
  // Block was just inserted and no field has been filled in yet - this is
  // expected (e.g. while editing in the live preview) and isn't an error.
  if (!url && !embedCode) {
    return null
  }

  if (embedCode) {
    const parsed = parseIframeEmbed(embedCode)

    if (!parsed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[VideoEmbed] Invalid embed code:', embedCode)
      }

      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Video embed error</p>
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

    // Defense-in-depth: only render allowlisted https sources (validation also happens at save)
    if (!/^https:\/\//i.test(parsed.src) || !isEmbedHostAllowed(host, ALLOWED_EMBED_HOSTS)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[VideoEmbed] Unsafe embed src:', parsed.src)
      }
      return (
        <div className="my-8 rounded-lg border-2 border-red-500 bg-red-50 p-6">
          <p className="mb-2 font-semibold text-red-900">Video embed error</p>
          <p className="text-sm text-red-800">Unable to generate embed from the provided code.</p>
        </div>
      )
    }

    return (
      <div className="my-8">
        <div className="overflow-hidden rounded-lg bg-gray-900">
          <iframe
            src={parsed.src}
            title={parsed.title ?? 'Video player'}
            width="100%"
            height={parsed.height ?? VIDEO_EMBED_DEFAULT_HEIGHT}
            frameBorder="0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    )
  }

  const embedData = getVideoEmbedData(url ?? '', locale)

  if (!embedData) {
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
      <div
        className="relative w-full overflow-hidden rounded-lg bg-gray-900"
        style={{ paddingBottom: `${paddingBottom}%` }}
      >
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
