/**
 * Video Embed Utilities
 *
 * Handles extraction of video IDs and generation of embed URLs
 * for supported video platforms (YouTube, arte.tv)
 */

export interface VideoEmbedData {
  platform: 'youtube' | 'arte'
  embedUrl: string
  videoId: string
}

/**
 * YouTube hostnames whose videos can be embedded
 */
export const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']

/**
 * Extracts a YouTube video ID from a URL, or null if unsupported.
 *
 * Single source of truth for YouTube ID extraction across validateVideoURL,
 * getVideoEmbedData, and VideoAccordion.
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 *
 * On youtube.com hosts the `?v=` query param takes precedence over path
 * formats, but a present yet invalid `?v=` rejects the URL rather than
 * falling through to the path. Extra params like `si`, `t`, and fragments
 * are ignored (only the ID is used).
 *
 * @param url - Full video URL
 * @returns 11-character YouTube video ID, or null
 *
 * @example
 * extractYouTubeVideoId('https://www.youtube.com/live/S3ozsKGx864?si=rXYcx6VPNwbLIxx3')
 * // => 'S3ozsKGx864'
 */
export function extractYouTubeVideoId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (!YOUTUBE_HOSTS.includes(parsed.hostname)) return null

  // youtu.be/VIDEO_ID
  if (parsed.hostname === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0]
    return /^[\w-]{11}$/.test(id) ? id : null
  }

  // youtube.com/watch?v=VIDEO_ID — a present `v` param wins, but invalid rejects
  const viaQuery = parsed.searchParams.get('v')
  if (viaQuery !== null) {
    return /^[\w-]{11}$/.test(viaQuery) ? viaQuery : null
  }

  // youtube.com/live/VIDEO_ID, /embed/VIDEO_ID, /shorts/VIDEO_ID
  const match = parsed.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]{11})\/?$/)
  return match ? match[1] : null
}

/**
 * Extracts video ID and generates privacy-enhanced embed URL from a video URL
 *
 * @param url - Full video URL (YouTube or arte.tv)
 * @param locale - Optional locale override for arte.tv embeds (defaults to locale in URL)
 * @returns Video embed data or null if URL is invalid
 *
 * @example
 * // YouTube
 * getVideoEmbedData('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // => { platform: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' }
 *
 * // arte.tv
 * getVideoEmbedData('https://www.arte.tv/de/videos/129940-002-A/jose-gonzalez/')
 * // => { platform: 'arte', embedUrl: 'https://www.arte.tv/player/v7/index.php?json_url=...', videoId: '129940-002-A' }
 *
 * // arte.tv with locale override
 * getVideoEmbedData('https://www.arte.tv/de/videos/129940-002-A/jose-gonzalez/', 'en')
 * // => Uses 'en' locale in embed URL instead of 'de' from URL
 */
export function getVideoEmbedData(url: string, locale?: 'de' | 'en'): VideoEmbedData | null {
  try {
    const parsed = new URL(url)

    // YouTube
    const youtubeId = extractYouTubeVideoId(url)
    if (youtubeId) {
      return {
        platform: 'youtube',
        videoId: youtubeId,
        // Use youtube-nocookie.com for privacy-enhanced mode (no cookies until user plays video)
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      }
    }

    // arte.tv
    const isArte = parsed.hostname.includes('arte.tv')

    if (isArte) {
      // Extract video ID from pathname: /de/videos/129940-002-A/slug/
      const match = parsed.pathname.match(/\/videos\/([^/]+)/)
      if (!match || !match[1]) return null

      const videoId = match[1]

      // Extract locale from URL if it's a valid locale (de or en)
      const pathParts = parsed.pathname.split('/').filter(Boolean)
      const urlLocale = pathParts[0] === 'de' || pathParts[0] === 'en' ? pathParts[0] : undefined

      // Use provided locale override, or extract from URL, or default to 'de'
      const embedLocale = locale || urlLocale || 'de'

      return {
        platform: 'arte',
        videoId,
        // Arte's embed player URL with correct locale
        embedUrl: `https://www.arte.tv/player/v7/index.php?json_url=https%3A%2F%2Fapi.arte.tv%2Fapi%2Fplayer%2Fv2%2Fconfig%2F${embedLocale}%2F${videoId}`,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Converts aspect ratio string to numeric ratio for CSS calculations
 *
 * @param aspectRatio - Aspect ratio string (e.g., '16:9', '4:3', '21:9')
 * @returns Percentage value for padding-bottom hack (e.g., 56.25 for 16:9)
 *
 * @example
 * getAspectRatioPadding('16:9') // => 56.25
 * getAspectRatioPadding('4:3')  // => 75
 * getAspectRatioPadding('21:9') // => 42.86
 */
export function getAspectRatioPadding(aspectRatio: string): number {
  const [width, height] = aspectRatio.split(':').map(Number)
  if (!width || !height) return 56.25 // Default to 16:9

  return (height / width) * 100
}
