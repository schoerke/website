/**
 * Audio Embed Validation
 *
 * Validates audio URLs for supported platforms (Spotify, Apple Music)
 */

/**
 * Validates audio URLs for supported streaming platforms
 *
 * Supported platforms:
 * - Spotify: open.spotify.com/track/ID, open.spotify.com/album/ID, open.spotify.com/playlist/ID
 * - Apple Music: music.apple.com/.../album/..., music.apple.com/.../playlist/...
 *
 * @param value - Audio URL to validate
 * @returns true if valid, error message if invalid
 */
export const validateAudioURL = (value: unknown): true | string => {
  if (typeof value !== 'string') return 'Please enter a valid audio URL'

  try {
    const url = new URL(value)

    // Spotify
    const isSpotify =
      url.hostname === 'open.spotify.com' || url.hostname === 'spotify.com' || url.hostname === 'play.spotify.com'

    if (isSpotify) {
      // Spotify URLs: /track/ID, /album/ID, /intl-{locale}/album/ID, etc.
      // Supports both standard and internationalized paths
      const spotifyMatch = url.pathname.match(/^(?:\/intl-[a-z]{2})?\/(track|album|playlist|artist|show|episode)\/[a-zA-Z0-9]+/)
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
