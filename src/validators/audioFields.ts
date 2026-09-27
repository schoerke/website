import { IFRAME_ATTR, IFRAME_TAG } from '@/utils/audioEmbed'
import { isEmptyField, isEmbedHostAllowed } from '@/utils/embeds'

/**
 * Audio Embed Validation
 *
 * Validates the three mutually exclusive fields on the AudioEmbed block: a Spotify/Apple Music
 * URL, a raw allowlisted <iframe> embed code, or a direct https audio file URL.
 */

type AudioFieldName = 'url' | 'embedCode' | 'fileUrl'

const AUDIO_FIELD_LABELS: Record<AudioFieldName, string> = {
  url: 'Audio URL',
  embedCode: 'Embed Code',
  fileUrl: 'Audio File URL',
}

const EMPTY_MESSAGE = 'Please enter an audio URL, embed code, or audio file URL'

/**
 * Context passed by Payload to field validators for the AudioEmbed block's three fields.
 */
interface AudioFieldsContext {
  siblingData?: { url?: unknown; embedCode?: unknown; fileUrl?: unknown }
}

/**
 * Returns the names of sibling audio fields (excluding `self`) that are currently non-empty.
 */
function otherNonEmptyFields(self: AudioFieldName, siblingData: AudioFieldsContext['siblingData']): AudioFieldName[] {
  return (['url', 'embedCode', 'fileUrl'] as const)
    .filter((name) => name !== self)
    .filter((name) => !isEmptyField(siblingData?.[name]))
}

/**
 * Builds a "Clear the X [and Y] field(s) first" message naming the conflicting sibling field(s).
 */
function conflictMessage(others: AudioFieldName[]): string {
  const labels = others.map((name) => AUDIO_FIELD_LABELS[name])
  const joined = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0]
  return `Clear the ${joined} field${others.length > 1 ? 's' : ''} first`
}

/**
 * Validates audio URLs for supported streaming platforms
 *
 * Supported platforms:
 * - Spotify: open.spotify.com/track/ID, open.spotify.com/album/ID, open.spotify.com/playlist/ID
 * - Apple Music: music.apple.com/.../album/..., music.apple.com/.../playlist/...
 *
 * Empty is allowed when a sibling field (embedCode or fileUrl) is set. Rejects if more than one
 * of the three fields is non-empty, naming the conflicting field(s).
 *
 * @param value - Audio URL to validate
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateAudioURL = (value: unknown, { siblingData }: AudioFieldsContext = {}): true | string => {
  const others = otherNonEmptyFields('url', siblingData)

  if (isEmptyField(value)) {
    return others.length > 0 ? true : EMPTY_MESSAGE
  }

  if (typeof value !== 'string') return 'Please enter a valid audio URL'

  let result: true | string
  try {
    const url = new URL(value)

    const isSpotify =
      url.hostname === 'open.spotify.com' || url.hostname === 'spotify.com' || url.hostname === 'play.spotify.com'

    if (isSpotify) {
      const spotifyMatch = url.pathname.match(
        /^(?:\/intl-[a-z]{2})?\/(track|album|playlist|artist|show|episode)\/[a-zA-Z0-9]+/
      )
      result = spotifyMatch
        ? true
        : 'Please enter a valid Spotify URL (track, album, playlist, artist, show, or episode)'
    } else {
      const isAppleMusic = url.hostname === 'music.apple.com' || url.hostname === 'geo.music.apple.com'

      if (isAppleMusic) {
        const appleMusicMatch = url.pathname.match(/\/[a-z]{2}\/(album|playlist)\/[^/]+\/[a-zA-Z0-9.]+/)
        result = appleMusicMatch ? true : 'Please enter a valid Apple Music URL (album or playlist)'
      } else {
        result = 'Please enter a valid Spotify or Apple Music URL'
      }
    }
  } catch {
    result = 'Please enter a valid URL format'
  }

  if (result !== true) return result

  if (others.length > 0) {
    return conflictMessage(others)
  }

  return true
}

/**
 * Validates raw <iframe> embed codes (e.g. RTS) against the host allowlist.
 *
 * Empty is allowed when a sibling field (url or fileUrl) is set. Rejects if more than one of
 * the three fields is non-empty, naming the conflicting field(s).
 *
 * @param value - Raw iframe snippet string
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateEmbedCode = (value: unknown, { siblingData }: AudioFieldsContext = {}): true | string => {
  const others = otherNonEmptyFields('embedCode', siblingData)

  if (isEmptyField(value)) {
    return others.length > 0 ? true : EMPTY_MESSAGE
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

  if (others.length > 0) {
    return conflictMessage(others)
  }

  return true
}

/**
 * Validates a direct audio file URL (e.g. a Dropbox share link). No extension or host
 * allowlist — restricted to `https:` only, since the value flows straight into `<audio src>`
 * and a raw `javascript:`/`data:` scheme would otherwise parse as a "valid URL".
 *
 * Empty is allowed when a sibling field (url or embedCode) is set. Rejects if more than one
 * of the three fields is non-empty, naming the conflicting field(s).
 *
 * @param value - Direct audio file URL to validate
 * @param context - Payload validation context (siblingData)
 * @returns true if valid, error message if invalid
 */
export const validateFileURL = (value: unknown, { siblingData }: AudioFieldsContext = {}): true | string => {
  const others = otherNonEmptyFields('fileUrl', siblingData)

  if (isEmptyField(value)) {
    return others.length > 0 ? true : EMPTY_MESSAGE
  }

  if (typeof value !== 'string') return 'Please enter a valid audio file URL'

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'Please enter a valid URL format'
  }

  if (url.protocol !== 'https:') return 'Please enter a valid audio file URL (https only)'

  if (others.length > 0) {
    return conflictMessage(others)
  }

  return true
}
