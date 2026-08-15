import type { Artist } from '@/payload-types'
import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

/**
 * Extracts the numeric IDs from a repertoire relationship value.
 *
 * Handles all three shapes Payload can produce:
 * - raw ID: `number` or `string`
 * - populated object: `{ id, ... }` (Local API with depth)
 * - admin form value: `{ relationTo, value }` (admin UI / REST)
 *
 * @param items - The relationship field value
 * @returns Array of numeric IDs
 */
function extractRepertoireIds(items: unknown): number[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (typeof item === 'number' || typeof item === 'string') return Number(item)
      if (typeof item !== 'object' || item === null) return NaN
      const obj = item as { id?: unknown; value?: unknown }
      if (typeof obj.id === 'number' || typeof obj.id === 'string') return Number(obj.id)
      if (typeof obj.value === 'number' || typeof obj.value === 'string') return Number(obj.value)
      return NaN
    })
    .filter((id): id is number => !Number.isNaN(id))
}

/**
 * Prevents removing repertoire docs from an artist's `repertoire` array.
 *
 * The `artist.repertoire` field is a derived, order-only list: repertoire docs are
 * linked/unlinked on the Repertoire collection (source of truth), and the artist's
 * list is populated by `syncArtistRepertoire`. Editors may reorder the list but
 * cannot add or remove entries from the artist side.
 *
 * Behavior:
 * - Allows reordering (same set of IDs, different order)
 * - Blocks removals with a clear error
 * - Blocks additions with a clear error (link via the Repertoire doc instead)
 * - Skips when `context.syncingRepertoire` is set (updates from our own sync hooks)
 * - Skips on create (no prior state to diff against)
 *
 * @see docs/superpowers/specs/2026-08-15-artist-repertoire-ordering-design.md
 */
export const enforceRepertoireOrderOnly: CollectionBeforeChangeHook = async ({ context, data, operation, originalDoc }) => {
  // Skip updates coming from our own sync hooks
  if (context.syncingRepertoire) {
    return data
  }

  // Nothing to diff on create
  if (operation === 'create' || !originalDoc) {
    return data
  }

  const previousIds = extractRepertoireIds((originalDoc as Artist).repertoire)
  const nextIds = extractRepertoireIds(data.repertoire)

  // Allow pure reordering — same set of IDs
  const removed = previousIds.filter((id) => !nextIds.includes(id))
  const added = nextIds.filter((id) => !previousIds.includes(id))

  if (removed.length > 0 || added.length > 0) {
    // Use APIError with isPublic: true — a plain Error gets sanitized to a generic
    // "Something went wrong" message in the admin UI; APIError surfaces the real message.
    throw new APIError(
      'Repertoire lists are managed on the Repertoire document. Link or unlink artists there, then reorder the list here.',
      400,
      undefined,
      true
    )
  }

  return data
}
