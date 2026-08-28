import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import { normalizeText } from '@/utils/search/normalizeText'

/**
 * Extracts the source string for the active locale from a field value
 * (plain string or localized object keyed by locale code).
 */
function extractLocalizedString(
  doc: Record<string, unknown> | undefined,
  field: string,
  locale: string | undefined
): string | undefined {
  const value = doc?.[field]

  if (!value) return undefined

  if (typeof value === 'object' && locale) {
    const localizedValue = (value as Record<string, unknown>)[locale]
    return typeof localizedValue === 'string' ? localizedValue : undefined
  }

  return typeof value === 'string' ? value : undefined
}

/**
 * Blocks a post save when another post already holds the same title (in the
 * active locale), throwing a clear error instead of the confusing slug
 * collision message.
 *
 * The slug only regenerates on create / empty slug / unpublished-draft edit,
 * so a published post edited to an already-used title keeps its old slug and
 * the duplicate would otherwise save silently.
 *
 * Runs on create AND update. On update, the current doc is excluded from the
 * collision query. Only the active locale is checked (localized title).
 *
 * Draft semantics: the query hits the LIVE posts table (no `draft: true`).
 * Never-published drafts (main-table rows with `_status='draft'`) are matched;
 * drafts of previously-published docs live only in `_posts_v` and are NOT
 * covered — same limitation as `blockDuplicateSlug`.
 *
 * Note: `payload.find` runs at collection-beforeChange time, BEFORE the
 * field-level hook that populates `normalizedTitle`, so this hook re-normalizes
 * `data.title` itself rather than reading a possibly-stale `normalizedTitle`.
 */
export const blockDuplicateTitle: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const title = extractLocalizedString(data as Record<string, unknown> | undefined, 'title', req?.locale)
  if (!title || !title.trim()) return data

  // Title unchanged → no collision possible (skip the query on content-only edits).
  if (originalDoc && typeof originalDoc === 'object') {
    const prevTitle = extractLocalizedString(originalDoc as Record<string, unknown>, 'title', req?.locale)
    if (prevTitle === title) return data
  }

  const currentId = originalDoc && typeof originalDoc === 'object' ? Number((originalDoc as { id?: number }).id) : NaN

  try {
    const result = await req.payload.find({
      collection: 'posts',
      where: {
        and: [
          { normalizedTitle: { equals: normalizeText(title) } },
          ...(Number.isFinite(currentId) ? [{ id: { not_equals: currentId } }] : []),
        ],
      },
      locale: req.locale ?? 'de',
      limit: 1,
      depth: 0,
    })

    if (result.totalDocs > 0) {
      const locale = req.locale ?? 'de'
      const message = locale === 'de' ? 'Dieser Titel wird bereits verwendet' : 'This title is already being used'
      throw new APIError(message, 400, undefined, true)
    }
  } catch (e) {
    if (e instanceof APIError) throw e
    // If the query itself fails, fall through and let Payload's own constraints handle it.
  }

  return data
}