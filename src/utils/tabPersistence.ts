export type TabId = 'biography' | 'repertoire' | 'discography' | 'media' | 'news' | 'projects'

export type MediaSection = 'images' | 'videos'

const LIST_MARKER_KEY = 'artist-tab-from-list'

/**
 * Checks whether the current visit to an artist page came from clicking a card
 * on the artist list page. The marker is scoped to the destination slug so a
 * stale or cancelled marker never forces biography on a different artist.
 *
 * @param slug - Destination artist slug
 * @returns True if the marker matches the slug
 */
export function isFromList(slug: string): boolean {
  try {
    return sessionStorage.getItem(LIST_MARKER_KEY) === slug
  } catch {
    return false
  }
}

/**
 * Clears the from-list marker. Called after the marker has been consumed so it
 * doesn't leak into later navigations.
 */
export function clearListMarker(): void {
  try {
    sessionStorage.removeItem(LIST_MARKER_KEY)
  } catch {
    // Storage unavailable — best-effort
  }
}

/**
 * Sets the from-list marker to the destination slug. Called when an artist card
 * is clicked so the artist page defaults to the biography tab.
 *
 * @param slug - Destination artist slug
 */
export function setListMarker(slug: string): void {
  try {
    sessionStorage.setItem(LIST_MARKER_KEY, slug)
  } catch {
    // Storage unavailable — best-effort
  }
}

// Strip the locale prefix so the key is identical across languages
// (e.g. /de/artists/foo and /en/artists/foo both map to /artists/foo)
function getTabStorageKey(pathname: string): string {
  return pathname.replace(/^\/(de|en)(?=\/)/, '') || '/'
}

/**
 * Reads the last-viewed tab for an artist from sessionStorage. Used to restore
 * the tab on back/forward navigation when no URL hash is present.
 *
 * @param pathname - Current pathname (locale prefix stripped for the key)
 * @returns Stored tab + media section, or null when absent or malformed
 */
export function readStoredTab(pathname: string): { tab: TabId; mediaSection?: MediaSection } | null {
  try {
    const raw = sessionStorage.getItem(getTabStorageKey(pathname))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tab?: unknown; mediaSection?: unknown }
    if (typeof parsed.tab !== 'string') return null
    const mediaSection: MediaSection | undefined =
      parsed.mediaSection === 'videos' ? 'videos' : parsed.mediaSection === 'images' ? 'images' : undefined
    return { tab: parsed.tab as TabId, mediaSection }
  } catch {
    return null
  }
}

/**
 * Persists the active tab + media section for an artist so it can be restored
 * on a later mount (e.g. back from a news article).
 *
 * @param pathname - Current pathname (locale prefix stripped for the key)
 * @param tab - Active tab
 * @param mediaSection - Active media section
 */
export function storeTab(pathname: string, tab: TabId, mediaSection: MediaSection): void {
  try {
    sessionStorage.setItem(getTabStorageKey(pathname), JSON.stringify({ tab, mediaSection }))
  } catch {
    // Storage unavailable (private mode, quota) — persistence is best-effort
  }
}
