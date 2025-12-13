import type { CollectionAfterChangeHook } from 'payload'

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

  try {
    // Only process if artists field changed
    const currentArtists = (doc.artists || []) as number[]
    const previousArtists = (previousDoc?.artists || []) as number[]

    // Find artists that were added or removed
    const addedArtists = currentArtists.filter((id) => !previousArtists.includes(id))
    const removedArtists = previousArtists.filter((id) => !currentArtists.includes(id))

    // Only proceed if post is in "projects" category
    const isProject = Array.isArray(doc.categories) && doc.categories.includes('projects')

    // Add context flag to prevent loops
    req.context = { ...req.context, syncingProjects: true }

    if (isProject) {
      // Add this post to newly linked artists
      for (const artistId of addedArtists) {
        const artist = await req.payload.findByID({
          collection: 'artists',
          id: artistId,
        })

        // Add post to projects array if not already there
        const projects = (artist.projects || []) as number[]
        if (!projects.includes(doc.id)) {
          await req.payload.update({
            collection: 'artists',
            id: artistId,
            data: {
              projects: [...projects, doc.id],
            },
          })
        }
      }
    }

    // Remove this post from unlinked artists (regardless of category)
    for (const artistId of removedArtists) {
      const artist = await req.payload.findByID({
        collection: 'artists',
        id: artistId,
      })

      const projects = (artist.projects || []) as number[]
      if (projects.includes(doc.id)) {
        await req.payload.update({
          collection: 'artists',
          id: artistId,
          data: {
            projects: projects.filter((id) => id !== doc.id),
          },
        })
      }
    }
  } catch (error) {
    // Log error but don't block post save
    const errorMessage = error instanceof Error ? error.message : String(error)
    req.payload.logger.error(`Failed to sync artist projects: ${errorMessage}`)
  }
}
