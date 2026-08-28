import { normalizeText } from '@/utils/search/normalizeText'

export interface TitleSuggestion {
  id: number
  title: string
  categories?: string[]
}

/**
 * Filters cached post titles against a typed query for the admin title field's
 * auto-suggest. Pure in-memory match (zero DB queries per keystroke).
 *
 * @param query - Raw input from the title field
 * @param titles - Cached existing post titles for the active locale
 * @param excludeId - Id of the post currently being edited (excluded from results)
 * @returns Matching titles, or [] when query is shorter than 3 chars
 */
export function filterTitleSuggestions(
  query: string,
  titles: TitleSuggestion[],
  excludeId?: number | string
): TitleSuggestion[] {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  const normalized = normalizeText(trimmed)
  return titles.filter(t => t.id !== excludeId && normalizeText(t.title).includes(normalized))
}