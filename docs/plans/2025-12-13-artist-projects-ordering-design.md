# Artist Projects Ordering Design

**Date:** 2025-12-13  
**Status:** Approved  
**Context:** Client request for custom ordering of projects on artist detail pages

## Overview

Enable content editors to control the order of projects displayed on individual artist pages using drag-and-drop in the
Payload admin UI. Projects remain managed through the Posts collection, but artists gain a new `projects` field for
ordering control.

## Requirements

- Max 8-10 projects per artist
- Drag-and-drop reordering in Payload admin
- Projects driven by Posts collection (maintain existing relationships)
- Automatic sync when posts are linked/unlinked from artists
- No pagination or search needed (small dataset)

## Architecture Decision

**Approach:** Hook-Based Sync (Automatic bidirectional sync)

- Posts collection remains the source of truth for relationships
- Artists collection gains a `projects` field for ordering
- `afterChange` hook on Posts automatically syncs relationships
- When post links artist → auto-add post to artist's projects array
- When post unlinks artist → auto-remove post from artist's projects array

**Why this approach:**

- Honors Posts as source of truth
- Provides ordering control where it makes sense (Artist pages)
- Automatic sync reduces editor workload
- Payload's hooks can handle the sync safely
- No breaking changes to existing workflows

## Implementation

### 1. Schema Changes

#### Artists Collection

Add a new "Projects" tab with `projects` relationship field:

```typescript
// In src/collections/Artists.ts
{
  type: 'tabs',
  tabs: [
    // ... existing tabs (General, Biography, Repertoire, Discography, Media, URLs)
    {
      label: {
        en: 'Projects',
        de: 'Projekte',
      },
      fields: [
        {
          name: 'projects',
          type: 'relationship',
          relationTo: 'posts',
          hasMany: true,
          maxRows: 10,
          label: {
            en: 'Featured Projects',
            de: 'Vorgestellte Projekte',
          },
          admin: {
            description: {
              en: 'Drag to reorder how projects appear on this artist\'s page. Projects are automatically added when linked from Posts.',
              de: 'Ziehen zum Sortieren, wie Projekte auf der Seite dieses Künstlers erscheinen. Projekte werden automatisch hinzugefügt, wenn sie von Beiträgen verknüpft werden.',
            },
          },
          filterOptions: {
            categories: {
              in: ['projects'],
            },
          },
          validate: (value: unknown) => {
            if (Array.isArray(value) && value.length > 10) {
              return 'Maximum 10 projects allowed per artist.'
            }
            return true
          },
        },
      ],
    },
  ],
}
```

**Key features:**

- Native drag-and-drop in Payload admin
- `filterOptions` ensures only project posts are selectable
- `maxRows: 10` enforces limit
- Clear description explains auto-sync behavior

### 2. Automatic Sync Hook

#### Posts Collection

Add `afterChange` hook to sync artist projects arrays:

```typescript
// In src/collections/Posts.ts
hooks: {
  afterChange: [
    async ({ doc, previousDoc, req, operation, context }) => {
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
        const currentArtists = doc.artists || []
        const previousArtists = previousDoc?.artists || []

        // Find artists that were added or removed
        const addedArtists = currentArtists.filter(id => !previousArtists.includes(id))
        const removedArtists = previousArtists.filter(id => !currentArtists.includes(id))

        // Only proceed if post is in "projects" category
        const isProject = doc.categories?.includes('projects')

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
            const projects = artist.projects || []
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

          const projects = artist.projects || []
          if (projects.includes(doc.id)) {
            await req.payload.update({
              collection: 'artists',
              id: artistId,
              data: {
                projects: projects.filter(id => id !== doc.id),
              },
            })
          }
        }

      } catch (error) {
        // Log error but don't block post save
        req.payload.logger.error('Failed to sync artist projects:', error)
      }
    },
  ],
}
```

**Hook behavior:**

- Only triggers when `artists` array changes
- Only adds if post has "projects" category
- Appends to end of artist's projects array (simple, predictable)
- Removes post when unlinked from artist
- Prevents duplicates
- Prevents infinite loops with context flag
- Only syncs published posts (ignores drafts)
- Logs errors without blocking post save

### 3. Frontend Changes

#### New Component: ProjectsTab

```typescript
// In src/components/Artist/ArtistTabContent.tsx

interface ProjectsTabProps {
  projects: Post[]
  emptyMessage: string
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ projects, emptyMessage }) => {
  if (!projects || projects.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {projects.map((project) => (
        <PostCard key={project.id} post={project} />
      ))}
    </div>
  )
}
```

**Key features:**

- Simple grid layout (no pagination needed for max 10 items)
- Reuses existing `PostCard` component
- Empty state handling
- Styling consistent with NewsFeed components

#### Update ArtistTabs Component

```typescript
// In src/components/Artist/ArtistTabs.tsx

// Remove NewsFeedClient for projects tab, use ProjectsTab instead
{activeTab === 'projects' && (
  <ProjectsTab
    projects={artist.projects || []}
    emptyMessage={t('empty.projects')}
  />
)}
```

**Simplifications:**

- No server action needed (projects already loaded with artist data)
- No loading states (data is pre-loaded)
- No pagination (max 10 items)
- Projects display in exact order from `artist.projects` array

#### Update Artist Data Fetching

```typescript
// In artist page component, add depth parameter to populate projects

const artist = await payload.findByID({
  collection: 'artists',
  id: artistId,
  depth: 2, // Populate projects relationships with full post data
  locale,
})
```

### 4. Data Migration

One-time migration script to populate existing artist projects:

```typescript
// In scripts/db/migrateArtistProjects.ts
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * Migrates existing post-artist relationships to artist.projects arrays.
 *
 * Finds all project posts and populates the new artist.projects field
 * based on existing post.artists relationships.
 *
 * Usage:
 *   pnpm tsx scripts/db/migrateArtistProjects.ts
 */
async function migrateArtistProjects() {
  const payload = await getPayload({ config })

  console.log('Starting artist projects migration...')

  // Find all project posts
  const { docs: projectPosts } = await payload.find({
    collection: 'posts',
    where: {
      categories: {
        contains: 'projects',
      },
    },
    limit: 1000,
  })

  console.log(`Found ${projectPosts.length} project posts`)

  // Build map of artist -> [project IDs]
  const artistProjectsMap = new Map()

  for (const post of projectPosts) {
    const artistIds = Array.isArray(post.artists) ? post.artists.map((a) => (typeof a === 'object' ? a.id : a)) : []

    for (const artistId of artistIds) {
      if (!artistProjectsMap.has(artistId)) {
        artistProjectsMap.set(artistId, [])
      }
      artistProjectsMap.get(artistId).push(post.id)
    }
  }

  console.log(`Updating ${artistProjectsMap.size} artists...`)

  // Update each artist with their projects
  let updated = 0
  for (const [artistId, projectIds] of artistProjectsMap) {
    await payload.update({
      collection: 'artists',
      id: artistId,
      data: {
        projects: projectIds,
      },
    })
    updated++
    console.log(`[${updated}/${artistProjectsMap.size}] Updated artist ${artistId} with ${projectIds.length} projects`)
  }

  console.log('Migration complete!')
  process.exit(0)
}

migrateArtistProjects()
```

**Migration notes:**

- Run once after deploying schema changes
- Safe to re-run (idempotent)
- Preserves all existing relationships
- Initial order will be arbitrary (editors can then drag-and-drop to reorder)

### 5. Edge Cases & Error Handling

#### Hook Safety

- **Infinite loop prevention:** Context flag `syncingProjects` prevents recursive updates
- **Draft handling:** Only syncs published posts (drafts don't trigger sync)
- **Error resilience:** Hook logs errors but doesn't block post save
- **Duplicate prevention:** Checks if post already exists in projects array before adding

#### Frontend Fallback

If migration hasn't run or projects array is missing, show helpful message:

```typescript
// Optional: Add to ProjectsTab component
const hasLegacyProjects = (!projects || projects.length === 0) && /* check via API if posts exist */

{hasLegacyProjects && (
  <div className="mb-4 rounded bg-yellow-50 p-4 text-sm text-yellow-800">
    Projects need to be re-ordered. Please edit this artist in the admin panel.
  </div>
)}
```

## Testing Checklist

- [ ] Create new artist, link project post → verify auto-added to projects array
- [ ] Reorder projects via drag-and-drop → verify order persists
- [ ] Unlink project from post → verify removed from artist's projects
- [ ] Link project to multiple artists → verify each can have different order
- [ ] Try to add 11th project → verify validation error
- [ ] Update post category to/from "projects" → verify sync behavior
- [ ] Save draft post with artist link → verify no sync (draft ignored)
- [ ] Publish draft with artist link → verify sync triggers
- [ ] Run migration script → verify all existing relationships populated
- [ ] Check frontend display → verify projects show in custom order

## Deployment Steps

1. Add `projects` field to Artists collection
2. Add `afterChange` hook to Posts collection
3. Run database migration: `pnpm tsx scripts/db/migrateArtistProjects.ts`
4. Update frontend components (ProjectsTab, ArtistTabs)
5. Update artist data fetching to include `depth: 2`
6. Test thoroughly in staging environment
7. Deploy to production

## Future Enhancements

- Add bulk reorder UI for managing multiple artists' projects at once
- Show project count badge in admin list view
- Add "featured project" toggle to highlight specific projects
- Analytics on which projects are most frequently featured

---

## Implementation Learnings (2025-12-14)

### Performance Optimization

**Initial Implementation:**

```typescript
// ❌ N+1 query pattern (slow)
for (const artistId of addedArtists) {
  const artist = await req.payload.findByID({ collection: 'artists', id: artistId })
  // ... update logic
  await req.payload.update({ collection: 'artists', id: artistId, data: { projects } })
}
```

**Optimized Implementation:**

```typescript
// ✅ Batched queries + parallel updates (fast)
const artistsResult = await req.payload.find({
  collection: 'artists',
  where: { id: { in: allArtistIds } },
  limit: allArtistIds.length,
})

const updates = artistsResult.docs.map((artist) => {
  // ... build update
  return req.payload.update({ collection: 'artists', id: artist.id, data: { projects } })
})

await Promise.all(updates)
```

**Impact:** 5 artists = 1 query + parallel updates vs 10 sequential queries (~80% faster)

### Type Safety with Relationships

**Problem:** Payload relationship fields can be IDs or populated objects depending on depth.

**Solution:** Helper functions to safely extract IDs:

```typescript
function extractId(item: number | Artist | Post): number {
  return typeof item === 'number' ? item : item.id
}

function extractIds(items: unknown[]): number[] {
  return items.map((item) => extractId(item as number | Artist | Post))
}
```

**Before:** `const currentArtists = (doc.artists || []) as number[]` // ❌ Unsafe cast  
**After:** `const currentArtists = extractIds(doc.artists || [])` // ✅ Handles both cases

### Server-Side Validation

**Lesson:** `maxRows` in admin UI is not enforced by API.

**Required:** Add explicit validation function:

```typescript
validate: (value: unknown) => {
  if (Array.isArray(value) && value.length > 10) {
    return 'Maximum 10 projects allowed per artist. Please remove some before adding more.'
  }
  return true
}
```

### Filter Options Best Practice

**Initial:** `filterOptions: { categories: { in: ['projects'] } }`  
**Problem:** Shows ALL project posts, not just those linked to this artist.

**Better:**

```typescript
filterOptions: ({ id }) =>
  ({
    and: [{ categories: { contains: 'projects' } }, { artists: { contains: id } }],
  }) as const
```

Shows only project posts already linked to this artist.

### Accessibility

**Added:**

- ARIA labels on project cards: `aria-label="Project: {title}"`
- Use CMS `image.alt` field instead of generic `project.title` for images
- Improves screen reader experience

### Testing Strategy

**Created:** Comprehensive test suite (24 tests) covering:

- Batched query behavior
- Parallel update execution
- Loop prevention
- Draft handling
- Error handling
- Edge cases (null arrays, non-arrays, empty values)

**Key insight:** Test the optimized implementation, not the naive one. Mock `find()` returning paginated results, not
individual `findByID()` calls.

### Service Layer Documentation

**Important:** Document performance trade-offs in code:

```typescript
/**
 * Manual Project Population:
 * Makes 2 queries instead of 1 to preserve project ordering.
 * Performance impact: ~80-170ms per page load
 *
 * Alternative: Use depth:2 for projects field, but ordering may not persist
 * in all Payload versions.
 */
```

Future maintainers need to understand why the extra query exists.

---

**Implementation:** See
[2025-12-13-artist-projects-ordering-implementation.md](./2025-12-13-artist-projects-ordering-implementation.md)  
**Status:** ✅ Complete (2025-12-14)
