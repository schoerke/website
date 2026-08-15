import type { Artist, Repertoire } from '@/payload-types'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

function extractId(item: number | Artist | Repertoire): number {
  return typeof item === 'number' ? item : item.id
}

function extractIds(items: unknown[]): number[] {
  return items.map((item) => extractId(item as number | Artist | Repertoire))
}

/**
 * Syncs artist.repertoire arrays when repertoire docs are linked/unlinked from artists.
 *
 * Appends this repertoire doc to newly linked artists' arrays and removes it from
 * unlinked artists. Per-artist ordering is preserved because each artist's array is
 * independent (duo/ensemble docs can appear in different positions per artist).
 *
 * @see docs/superpowers/specs/2026-08-15-artist-repertoire-ordering-design.md
 *
 * Hook behavior:
 * - Only triggers when `artists` array changes
 * - Appends to end of artist's repertoire array (simple, predictable)
 * - Removes doc when unlinked from artist
 * - Prevents duplicates
 * - Prevents infinite loops with context flag
 * - Logs errors without blocking repertoire save
 */
export const syncArtistRepertoire: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  // Prevent infinite loop - skip if this update came from our hook
  if (context.syncingRepertoire) {
    return
  }

  let addedArtists: number[] = []
  let removedArtists: number[] = []

  try {
    // Only process if artists field changed - safely extract IDs
    const currentArtists = extractIds(doc.artists || [])
    const previousArtists = extractIds(previousDoc?.artists || [])

    // Find artists that were added or removed
    addedArtists = currentArtists.filter((id) => !previousArtists.includes(id))
    removedArtists = previousArtists.filter((id) => !currentArtists.includes(id))

    // Early exit if no changes to sync
    if (addedArtists.length === 0 && removedArtists.length === 0) {
      return
    }

    // Add context flag to prevent loops
    req.context = { ...req.context, syncingRepertoire: true }

    // Batch all artist queries together for better performance
    const allArtistIds = [...new Set([...addedArtists, ...removedArtists])]

    // Fetch all affected artists in a single query
    const artistsResult = await req.payload.find({
      collection: 'artists',
      where: { id: { in: allArtistIds } },
      limit: allArtistIds.length,
    })

    // Build update operations for each artist
    const updates: Promise<unknown>[] = []

    for (const artist of artistsResult.docs) {
      const repertoire = extractIds(artist.repertoire || [])
      let newRepertoire = [...repertoire]
      let hasChanges = false

      // Add this doc to newly linked artists
      if (addedArtists.includes(artist.id) && !repertoire.includes(doc.id)) {
        newRepertoire.push(doc.id)
        hasChanges = true
      }

      // Remove this doc from unlinked artists
      if (removedArtists.includes(artist.id) && repertoire.includes(doc.id)) {
        newRepertoire = newRepertoire.filter((id) => id !== doc.id)
        hasChanges = true
      }

      // Only update if there are actual changes
      if (hasChanges) {
        updates.push(
          req.payload.update({
            collection: 'artists',
            id: artist.id,
            data: {
              repertoire: newRepertoire,
            },
            // Propagate the sync flag so the Artists beforeChange hook allows this removal
            context: { syncingRepertoire: true },
          })
        )
      }
    }

    // Execute all updates in parallel
    await Promise.all(updates)
  } catch (error) {
    // Log error with context but don't block repertoire save
    const errorMessage = error instanceof Error ? error.message : String(error)
    req.payload.logger.error(
      `Failed to sync artist repertoire for repertoire ${doc.id} ("${doc.title}"): ${errorMessage}. ` +
        `Added artists: [${addedArtists.join(', ')}], Removed artists: [${removedArtists.join(', ')}]`
    )
  }
}

/**
 * Removes a deleted repertoire doc from every artist's repertoire array.
 *
 * Queries all artists whose repertoire array contains the deleted doc ID and
 * removes it. Prevents orphaned references when a repertoire doc is deleted.
 */
export const syncArtistRepertoireOnDelete: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  // Prevent infinite loop - skip if this update came from our hook
  if (context.syncingRepertoire) {
    return
  }

  try {
    // Find all artists that reference this repertoire doc
    const artistsResult = await req.payload.find({
      collection: 'artists',
      where: { repertoire: { contains: doc.id } },
      limit: 1000,
    })

    const updates = artistsResult.docs.map((artist) => {
      const newRepertoire = extractIds(artist.repertoire || []).filter((id) => id !== doc.id)
      return req.payload.update({
        collection: 'artists',
        id: artist.id,
        data: {
          repertoire: newRepertoire,
        },
        // Propagate the sync flag so the Artists beforeChange hook allows this removal
        context: { syncingRepertoire: true },
      })
    })

    await Promise.all(updates)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    req.payload.logger.error(`Failed to remove repertoire ${doc.id} from artists: ${errorMessage}`)
  }
}
