import type { Artist, Post } from '@/payload-types'
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Helper function to safely extract IDs from relationship fields.
 * Handles both populated objects and raw IDs.
 *
 * @param item - Relationship field value (can be ID or populated object)
 * @returns The numeric ID
 */
function extractId(item: number | Artist | Post): number {
  return typeof item === 'number' ? item : item.id
}

/**
 * Helper function to safely extract array of IDs from relationship array.
 *
 * @param items - Array of relationship values (can be IDs or populated objects)
 * @returns Array of numeric IDs
 */
function extractIds(items: unknown[]): number[] {
  return items.map((item) => extractId(item as number | Artist | Post))
}

/**
 * Syncs artist.projects arrays when posts are linked/unlinked.
 *
 * Automatically adds project posts to linked artists' projects arrays
 * and removes them when unlinked. Only syncs published posts with
 * "projects" category.
 *
 * @see docs/plans/2025-12-13-artist-projects-ordering-design.md
 *
 * Hook behavior:
 * - Only triggers when `artists` array changes
 * - Only adds if post has "projects" category
 * - Appends to end of artist's projects array (simple, predictable)
 * - Removes post when unlinked from artist
 * - Prevents duplicates
 * - Prevents infinite loops with context flag
 * - Only syncs published posts (ignores drafts)
 * - Logs errors without blocking post save
 */
export const syncArtistProjects: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  // Prevent infinite loop - skip if this update came from our hook
  if (context.syncingProjects) {
    return
  }

  // Only sync published posts
  if (doc._status === 'draft') {
    return
  }

  // Declare variables outside try block for error logging
  let addedArtists: number[] = []
  let removedArtists: number[] = []

  try {
    // Only process if artists field changed - safely extract IDs
    const currentArtists = extractIds(doc.artists || [])
    const previousArtists = extractIds(previousDoc?.artists || [])

    // Find artists that were added or removed
    addedArtists = currentArtists.filter((id) => !previousArtists.includes(id))
    removedArtists = previousArtists.filter((id) => !currentArtists.includes(id))

    // Only proceed if post is in "projects" category
    const isProject = Array.isArray(doc.categories) && doc.categories.includes('projects')

    // Early exit if no changes to sync:
    // - If only additions and post is not a project, nothing to do
    // - If no additions and no removals, nothing to do
    if (
      (addedArtists.length > 0 && removedArtists.length === 0 && !isProject) ||
      (addedArtists.length === 0 && removedArtists.length === 0)
    ) {
      return
    }

    // Add context flag to prevent loops
    req.context = { ...req.context, syncingProjects: true }

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
      const projects = extractIds(artist.projects || [])
      let newProjects = [...projects]
      let hasChanges = false

      // Add this post to newly linked artists (only if it's a project)
      if (isProject && addedArtists.includes(artist.id) && !projects.includes(doc.id)) {
        newProjects.push(doc.id)
        hasChanges = true
      }

      // Remove this post from unlinked artists (regardless of category)
      if (removedArtists.includes(artist.id) && projects.includes(doc.id)) {
        newProjects = newProjects.filter((id) => id !== doc.id)
        hasChanges = true
      }

      // Only update if there are actual changes
      if (hasChanges) {
        updates.push(
          req.payload.update({
            collection: 'artists',
            id: artist.id,
            data: {
              projects: newProjects,
            },
          }),
        )
      }
    }

    // Execute all updates in parallel
    await Promise.all(updates)
  } catch (error) {
    // Log error with context but don't block post save
    const errorMessage = error instanceof Error ? error.message : String(error)
    req.payload.logger.error(
      `Failed to sync artist projects for post ${doc.id} ("${doc.title}"): ${errorMessage}. ` +
        `Added artists: [${addedArtists.join(', ')}], Removed artists: [${removedArtists.join(', ')}]`,
    )
  }
}
