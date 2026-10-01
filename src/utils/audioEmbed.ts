/**
 * Audio Embed Utilities
 *
 * Handles extraction of audio IDs and generation of embed URLs
 * for supported audio streaming platforms (Spotify, Apple Music)
 */

export interface AudioEmbedData {
  platform: 'spotify' | 'appleMusic'
  embedUrl: string
  contentId: string
  contentType: 'track' | 'album' | 'playlist' | 'artist' | 'show' | 'episode'
}

/**
 * Extracts audio content ID and generates embed URL from a streaming URL
 *
 * @param url - Full streaming URL (Spotify or Apple Music)
 * @returns Audio embed data or null if URL is invalid
 *
 * @example
 * // Spotify track
 * getAudioEmbedData('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')
 * // => { platform: 'spotify', embedUrl: 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT', contentId: '4cOdK2wGLETKBW3PvgPWqT', contentType: 'track' }
 *
 * // Apple Music album
 * getAudioEmbedData('https://music.apple.com/us/album/example/1234567890')
 * // => { platform: 'appleMusic', embedUrl: 'https://embed.music.apple.com/us/album/1234567890', contentId: '1234567890', contentType: 'album' }
 */
export function getAudioEmbedData(url: string): AudioEmbedData | null {
  try {
    const parsed = new URL(url)

    // Spotify
    const isSpotify =
      parsed.hostname === 'open.spotify.com' ||
      parsed.hostname === 'spotify.com' ||
      parsed.hostname === 'play.spotify.com'

    if (isSpotify) {
      // Extract type and ID: /track/ID or /intl-de/album/ID
      // Match both standard (/album/ID) and internationalized (/intl-de/album/ID) paths
      const match = parsed.pathname.match(
        /^(?:\/intl-[a-z]{2})?\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/
      )
      if (!match) return null

      const [, contentType, contentId] = match

      return {
        platform: 'spotify',
        contentType: contentType as AudioEmbedData['contentType'],
        contentId,
        embedUrl: `https://open.spotify.com/embed/${contentType}/${contentId}`,
      }
    }

    // Apple Music
    const isAppleMusic = parsed.hostname === 'music.apple.com' || parsed.hostname === 'geo.music.apple.com'

    if (isAppleMusic) {
      // Extract country, type, and ID: /us/album/example/1234567890
      const match = parsed.pathname.match(/\/([a-z]{2})\/(album|playlist)\/[^/]+\/([a-zA-Z0-9.]+)/)
      if (!match) return null

      const [, country, contentType, contentId] = match

      return {
        platform: 'appleMusic',
        contentType: contentType as 'album' | 'playlist',
        contentId,
        embedUrl: `https://embed.music.apple.com/${country}/${contentType}/${contentId}`,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Gets default height for audio embed based on content type
 *
 * @param contentType - Type of audio content
 * @returns Height in pixels
 *
 * @example
 * getAudioEmbedHeight('track') // => 152 (Spotify compact player)
 * getAudioEmbedHeight('album') // => 380 (Spotify full player)
 */
export function getAudioEmbedHeight(contentType: AudioEmbedData['contentType']): number {
  switch (contentType) {
    case 'track':
    case 'episode':
      return 152 // Compact player
    case 'album':
    case 'playlist':
    case 'show':
      return 380 // Full player with tracklist
    case 'artist':
      return 380 // Artist profile
    default:
      return 380
  }
}

/**
 * Data extracted from an <iframe> embed snippet.
 *
 * Only the first iframe tag in the snippet is inspected, and only its
 * src/width/height/title attributes are read. The host is NOT validated
 * here — that is the job of the embed code validator (see
 * `src/validators/audioFields.ts`).
 */
export interface ParsedIframe {
  src: string
  width?: number
  height?: number
  title?: string
}

export const IFRAME_TAG = /<iframe\b[^>]*>/i

/**
 * Matches `name="value"`, `name='value'`, or the unquoted HTML5 form `name=value`
 * (terminated by whitespace or `>`) -- e.g. SoundCloud's generated embed code omits
 * quotes around `src`. Exactly one of the three capture groups will be defined
 * depending on which form matched; use {@link attrValue} to resolve it.
 *
 * The unquoted branch doesn't need to guard against swallowing a following
 * attribute: HTML always requires whitespace between two attributes regardless
 * of quoting, so `[^\s>]+` naturally stops at the boundary either way.
 */
export const IFRAME_ATTR = (name: string) =>
  new RegExp(`(?<![\\w-])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')

/**
 * Resolves the captured attribute value from an {@link IFRAME_ATTR} match,
 * regardless of whether the source used double quotes, single quotes, or no
 * quotes at all.
 */
export function attrValue(match: RegExpMatchArray | null): string | undefined {
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

/**
 * Extracts src/width/height/title from the first <iframe> tag in a snippet.
 *
 * Only the first iframe tag is inspected, and attribute extraction is scoped
 * to that tag (attributes on other elements are ignored). Does NOT validate
 * the host — the allowlist check lives in the embed code validator.
 *
 * @param code - Raw embed snippet (may contain surrounding HTML)
 * @returns Parsed iframe data, or null if no iframe with a src is found
 *
 * @example
 * parseIframeEmbed('<iframe src="https://www.rts.ch/x" width="392"></iframe>')
 * // => { src: 'https://www.rts.ch/x', width: 392 }
 */
export function parseIframeEmbed(code: string): ParsedIframe | null {
  if (!code || !/<iframe\b/i.test(code)) return null

  const tag = code.match(IFRAME_TAG)?.[0] ?? ''
  if (!tag) return null

  const src = attrValue(tag.match(IFRAME_ATTR('src')))
  if (!src) return null

  const num = (match: RegExpMatchArray | null): number | undefined => {
    const n = Number(attrValue(match))
    return Number.isFinite(n) ? n : undefined
  }

  const parsed: ParsedIframe = { src }

  const width = num(tag.match(IFRAME_ATTR('width')))
  const height = num(tag.match(IFRAME_ATTR('height')))
  const title = attrValue(tag.match(IFRAME_ATTR('title')))

  if (width !== undefined) parsed.width = width
  if (height !== undefined) parsed.height = height
  if (title) parsed.title = title

  return parsed
}
