/**
 * Rewrites a pasted Dropbox share link to its direct-stream form so a native `<audio src>`
 * plays the raw file instead of Dropbox's HTML preview page.
 *
 * - Matches both `www.dropbox.com` and bare `dropbox.com` hosts, covering both the legacy
 *   `/s/...` and current `/scl/fi/...` Dropbox share URL shapes.
 * - Uses `URLSearchParams` to set `dl=1` without disturbing any other existing query params
 *   (e.g. `rlkey=...` on the newer share format), and appends `?dl=1` when there's no query
 *   string at all.
 * - Already-direct links (`dl.dropboxusercontent.com`) and any non-Dropbox URL pass through
 *   unchanged.
 * - Defensive: if the input isn't a parseable URL, it's returned unchanged rather than thrown.
 *
 * @param value - The raw URL string as pasted into the fileUrl field
 * @returns The normalized (or unchanged) URL string
 */
export function normalizeAudioFileUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }

  const isDropboxShareHost = url.hostname === 'www.dropbox.com' || url.hostname === 'dropbox.com'
  if (!isDropboxShareHost) return value

  url.searchParams.set('dl', '1')
  return url.toString()
}
