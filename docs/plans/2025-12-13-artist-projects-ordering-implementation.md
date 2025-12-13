# Artist Projects Ordering - Implementation Plan

**Design Document:** [2025-12-13-artist-projects-ordering-design.md](./2025-12-13-artist-projects-ordering-design.md)  
**Branch:** `feat/artist-projects`  
**Date:** 2025-12-13

## Task Breakdown

### Phase 1: Schema Changes

#### Task 1.1: Add Projects Tab to Artists Collection
- [ ] Open `src/collections/Artists.ts`
- [ ] Add new "Projects" tab after the URLs tab
- [ ] Add `projects` relationship field with:
  - `type: 'relationship'`
  - `relationTo: 'posts'`
  - `hasMany: true`
  - `maxRows: 10`
  - Validation function for 10-item limit
  - `filterOptions` to show only projects category
  - Localized labels and descriptions
- [ ] Run `pnpm payload generate:types` to update TypeScript types
- [ ] Verify field appears in Payload admin UI

**Files to modify:**
- `src/collections/Artists.ts`

**Verification:**
- Start dev server: `pnpm dev`
- Navigate to Artists collection in admin
- Verify "Projects" tab exists
- Verify drag-and-drop works for relationship array
- Verify filter shows only project posts

---

### Phase 2: Automatic Sync Hook

#### Task 2.1: Create Hook Helper Function
- [ ] Create `src/collections/hooks/syncArtistProjects.ts`
- [ ] Implement the `afterChange` hook logic:
  - Context flag check (`syncingProjects`)
  - Draft status check
  - Compare current vs previous artists arrays
  - Find added and removed artists
  - Check if post has "projects" category
  - Add post to artist's projects array (append)
  - Remove post from unlinked artist's projects
  - Error handling with logging
- [ ] Add JSDoc documentation
- [ ] Export the hook function

**Files to create:**
- `src/collections/hooks/syncArtistProjects.ts`

**Implementation notes:**
```typescript
/**
 * Syncs artist.projects arrays when posts are linked/unlinked.
 * 
 * Automatically adds project posts to linked artists' projects arrays
 * and removes them when unlinked. Only syncs published posts with
 * "projects" category.
 * 
 * @see docs/plans/2025-12-13-artist-projects-ordering-design.md
 */
export const syncArtistProjects = async ({ doc, previousDoc, req, context }) => {
  // Implementation here
}
```

#### Task 2.2: Add Hook to Posts Collection
- [ ] Open `src/collections/Posts.ts`
- [ ] Import the `syncArtistProjects` hook
- [ ] Add to `hooks.afterChange` array
- [ ] Test hook behavior

**Files to modify:**
- `src/collections/Posts.ts`

**Verification:**
- Create new project post
- Link to an artist
- Check artist's Projects tab → post should appear
- Unlink artist
- Check artist's Projects tab → post should be removed
- Check logs for any errors

---

### Phase 3: Frontend Components

#### Task 3.1: Create ProjectsTab Component
- [ ] Open `src/components/Artist/ArtistTabContent.tsx`
- [ ] Add `ProjectsTab` component:
  - Props: `projects: Post[]`, `emptyMessage: string`
  - Empty state handling
  - Grid layout (2 columns on md+)
  - Reuse `PostCard` component
- [ ] Export the component
- [ ] Follow project's React component pattern

**Files to modify:**
- `src/components/Artist/ArtistTabContent.tsx`

**Verification:**
- Component follows standard pattern: `const ProjectsTab: React.FC<ProjectsTabProps> = ...`
- Props interface defined above component
- Default export

#### Task 3.2: Update ArtistTabs Component
- [ ] Open `src/components/Artist/ArtistTabs.tsx`
- [ ] Import `ProjectsTab` from `./ArtistTabContent`
- [ ] Replace `NewsFeedClient` for projects tab with `ProjectsTab`
- [ ] Pass `artist.projects` and `emptyMessage` props
- [ ] Remove unused `fetchRecordingsByArtist` logic for projects (if any)

**Files to modify:**
- `src/components/Artist/ArtistTabs.tsx`

**Verification:**
- Projects tab displays correctly
- Grid layout works responsively
- Empty state shows when no projects
- Clicking project card navigates correctly

#### Task 3.3: Update Artist Data Fetching
- [ ] Find where artist data is fetched (likely in artist detail page)
- [ ] Ensure `depth: 2` is set to populate projects relationships
- [ ] Verify projects are populated with full post data

**Files to check/modify:**
- `src/app/(frontend)/[locale]/artists/[slug]/page.tsx` (or similar)

**Verification:**
- Artist data includes fully populated projects
- Projects array contains Post objects, not just IDs
- Order is preserved from database

---

### Phase 4: Data Migration

#### Task 4.1: Create Migration Script
- [ ] Create `scripts/db/migrateArtistProjects.ts`
- [ ] Import necessary dependencies (`dotenv/config`, `getPayload`, etc.)
- [ ] Implement migration logic:
  - Find all project posts
  - Build artist → projects map
  - Update each artist with their projects
  - Log progress
- [ ] Add JSDoc with usage instructions
- [ ] Add error handling

**Files to create:**
- `scripts/db/migrateArtistProjects.ts`

**Implementation checklist:**
- [ ] Import `dotenv/config` at top
- [ ] Use `getPayload({ config })`
- [ ] Query posts with `categories: { contains: 'projects' }`
- [ ] Handle both ID and object formats for `post.artists`
- [ ] Log progress for each artist updated
- [ ] Exit with `process.exit(0)`

#### Task 4.2: Run Migration (After Testing)
- [ ] Test migration on local database first
- [ ] Review output and verify data
- [ ] Document any issues
- [ ] Run on production (deployment step)

**Commands:**
```bash
# Test locally
pnpm tsx scripts/db/migrateArtistProjects.ts

# Verify in admin UI
pnpm dev
# Check Artists → Projects tabs
```

---

### Phase 5: Testing

#### Task 5.1: Manual Testing Checklist
- [ ] Create new artist
- [ ] Create new project post
- [ ] Link artist to project → verify auto-added to artist.projects
- [ ] Drag-and-drop reorder projects → verify order persists
- [ ] Unlink artist from project → verify removed from artist.projects
- [ ] Link same project to multiple artists → verify each can have different order
- [ ] Try adding 11th project → verify validation error
- [ ] Change post category from "projects" to "news" → verify sync behavior
- [ ] Save draft post with artist link → verify no sync
- [ ] Publish draft → verify sync triggers
- [ ] Run migration script → verify existing data populated

#### Task 5.2: Create Unit Tests (Optional but Recommended)
- [ ] Test hook logic: `src/collections/hooks/syncArtistProjects.spec.ts`
- [ ] Test ProjectsTab component: `src/components/Artist/ArtistTabContent.spec.tsx` (add tests)
- [ ] Mock Payload API calls
- [ ] Test edge cases (empty arrays, duplicates, etc.)

**Files to create/modify:**
- `src/collections/hooks/syncArtistProjects.spec.ts`
- `src/components/Artist/ArtistTabContent.spec.tsx`

---

### Phase 6: Documentation & Cleanup

#### Task 6.1: Update Translation Files
- [ ] Add `empty.projects` translation key if missing
- [ ] Verify tab labels exist for "Projects" tab

**Files to check:**
- `src/i18n/de.ts`
- `src/i18n/en.ts`

#### Task 6.2: Code Review Checklist
- [ ] All TypeScript types generated and correct
- [ ] No `any` types introduced
- [ ] Follows project conventions (React patterns, imports at top, etc.)
- [ ] Hook has proper error handling
- [ ] Migration script has JSDoc
- [ ] Components follow naming conventions
- [ ] Code formatted with Prettier: `pnpm format`
- [ ] No linting errors: `pnpm lint`

#### Task 6.3: Update Implementation Plan Status
- [ ] Mark all tasks complete
- [ ] Note any deviations from design
- [ ] Document any issues encountered

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm typecheck` (if available)
- [ ] Code formatted: `pnpm format`
- [ ] Code linted: `pnpm lint`

### Deployment Steps
1. [ ] Merge `feat/artist-projects` to `main`
2. [ ] Deploy to staging environment
3. [ ] Run migration script on staging database
4. [ ] Verify functionality in staging
5. [ ] Deploy to production
6. [ ] Run migration script on production database
7. [ ] Verify functionality in production
8. [ ] Monitor logs for hook errors

### Post-Deployment
- [ ] Test creating new projects in production
- [ ] Test reordering existing projects
- [ ] Verify performance (hook shouldn't slow down post saves)
- [ ] Check error logs for any issues

---

## Rollback Plan

If issues occur:

1. **Immediate:** Revert deployment
2. **Data cleanup:** Projects arrays can be cleared without data loss (posts.artists still intact)
3. **Hook disable:** Remove hook from Posts collection temporarily
4. **Investigation:** Check logs for specific errors

---

## Notes

- Hook is designed to be non-blocking (errors logged, not thrown)
- Migration is idempotent (safe to re-run)
- Original `posts.artists` relationship unchanged (can rebuild projects arrays if needed)
- Max 10 projects enforced at schema level (validation + maxRows)

---

## Estimated Time

- Phase 1: 30 minutes
- Phase 2: 1 hour
- Phase 3: 45 minutes
- Phase 4: 30 minutes
- Phase 5: 1 hour (manual testing)
- Phase 6: 30 minutes

**Total:** ~4-5 hours
