import { IFRAME_ATTR, IFRAME_TAG } from '@/utils/audioEmbed'
import { isEmbedHostAllowed } from '@/utils/embeds'

/**
 * Audio Embed Validation
 *
 * Validates audio URLs for supported platforms (Spotify, Apple Music)
 */

/**
 * Context passed by Payload to field validators
 */
interface AudioURLContext {
  siblingData?: { url?: unknown; embedCode?: unknown }
}

/**
 * Returns true when a field value is effectively empty (missing or whitespace-only)
 */
const isEmptyAudioField = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/**
 * Validates audio URLs for supported streaming platforms
 *
 * Supported platforms:
 * - Spotify: open.spotify.com/track/ID, open.spotify.com/album/ID, open.spotify.com/playlist/ID
 * - Apple Music: music.apple.com/.../album/..., music.apple.com/.../playlist/...
 *
 * An empty url is allowed when an embed code is set on the sibling field.
 *
 * @param value - Audio URL to validate
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateAudioURL = (value: unknown, { siblingData }: AudioURLContext = {}): true | string => {
  const embedCode = siblingData?.embedCode

  // Empty url is fine when an embed code is set on the sibling field
  if (isEmptyAudioField(value) && typeof embedCode === 'string' && embedCode.trim() !== '') {
    return true
  }

  if (isEmptyAudioField(value)) {
    return 'Please enter either an audio URL or an embed code'
  }

  if (typeof value !== 'string') return 'Please enter a valid audio URL'

  try {
    const url = new URL(value)

    // Spotify
    const isSpotify =
      url.hostname === 'open.spotify.com' || url.hostname === 'spotify.com' || url.hostname === 'play.spotify.com'

    if (isSpotify) {
      // Spotify URLs: /track/ID, /album/ID, /intl-{locale}/album/ID, etc.
      // Supports both standard and internationalized paths
      const spotifyMatch = url.pathname.match(
        /^(?:\/intl-[a-z]{2})?\/(track|album|playlist|artist|show|episode)\/[a-zA-Z0-9]+/
      )
      if (!spotifyMatch) {
        return 'Please enter a valid Spotify URL (track, album, playlist, artist, show, or episode)'
      }
      return true
    }

    // Apple Music
    const isAppleMusic = url.hostname === 'music.apple.com' || url.hostname === 'geo.music.apple.com'

    if (isAppleMusic) {
      // Apple Music URLs: /{country}/album/{name}/{id}, /{country}/playlist/{name}/{id}
      const appleMusicMatch = url.pathname.match(/\/[a-z]{2}\/(album|playlist)\/[^/]+\/[a-zA-Z0-9.]+/)
      if (!appleMusicMatch) {
        return 'Please enter a valid Apple Music URL (album or playlist)'
      }
      return true
    }

    return 'Please enter a valid Spotify or Apple Music URL'
  } catch {
    return 'Please enter a valid URL format'
  }
}

/**
 * Validates raw <iframe> embed codes (e.g. RTS) against the host allowlist.
 *
 * An empty embed code is allowed when a url is set on the sibling field.
 *
 * @param value - Raw iframe snippet string
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateEmbedCode = (value: unknown, { siblingData }: AudioURLContext = {}): true | string => {
  const siblingUrl = siblingData?.url

  if (isEmptyAudioField(value) && typeof siblingUrl === 'string' && siblingUrl.trim() !== '') {
    return true
  }

  if (isEmptyAudioField(value)) {
    return 'Please enter either an audio URL or an embed code'
  }

  if (typeof value !== 'string' || !IFRAME_TAG.test(value)) {
    return 'Please enter a valid embed code'
  }

  const tag = value.match(IFRAME_TAG)?.[0] ?? ''
  const srcMatch = tag.match(IFRAME_ATTR('src'))
  if (!srcMatch || !srcMatch[1]) return 'Please enter a valid embed code'

  let url: URL
  try {
    url = new URL(srcMatch[1])
  } catch {
    return 'Please enter a valid embed code'
  }

  if (url.protocol !== 'https:') return 'Please enter a valid embed code'

  if (!isEmbedHostAllowed(url.hostname)) return 'Embed iframe host is not allowed'

  return true
}
