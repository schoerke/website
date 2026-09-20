# Scheduled Post Publishing Design

**Date:** 2026-09-20  
**Status:** Design (awaiting implementation)  
**Owner:** Scott  
**Related Issue:** docs/ideas.md #41 (Scheduled Publishing v2)

## Overview

Enable content editors to schedule posts for automatic publication at future dates/times using Payload's built-in `schedulePublish` feature + jobs queue. Implementation requires:
1. Enable `schedulePublish: true` in Posts config (admin UI auto-generated)
2. Write a custom job task to publish scheduled drafts (Payload provides no built-in task)
3. Configure job runner with cron scheduling in payload.config.ts

Leverages official Payload patterns already proven in the website template.

## Requirements

- Allow editors to schedule drafts for future publication (specific date/time)
- Posts publish automatically at scheduled time without manual intervention
- Only the most recent draft version of a post can publish on schedule
- Leverage Payload's built-in `schedulePublish` feature (admin UI, metadata storage)
- All existing post hooks trigger on publish (revalidate, search index, artist sync)

**Phase 1 scope:** Publish scheduling only. **Phase 2:** Unpublish scheduling, notifications, calendar view.

## Architecture

### High-Level Flow

```
Editor creates draft post
    ↓
Opens "Schedule publish" date picker (admin UI)
    ↓
Selects: Sept 25, 2026, 10:00 AM
    ↓
Saves draft with scheduled date
    ↓
Payload jobs queue checks every minute (cron)
    ↓
When Sept 25, 10:00 AM arrives → job publishes post
    ↓
Post goes live (_status: published)
    ↓
All hooks run: revalidate, search index, artist sync, etc.
```

### Components

#### 1. Posts Collection Config
Enable `schedulePublish: true` in versions config. This tells Payload to:
- Add "Schedule publish" and "Schedule unpublish" date/time pickers to admin UI
- Store publish/unpublish dates in `_versions` table
- Expose these dates to the jobs queue for checking

**Current state:** Posts.ts uses `versions: { drafts: { autosave: false } }`  
**Change:** Add `schedulePublish: true` to drafts config

#### 2. Custom Job Task Handler
Payload's `schedulePublish: true` stores metadata but does **not** include a built-in task to publish scheduled drafts. Implementation must write this.

**File:** `src/jobs/tasks/publishScheduledDrafts.ts` (NEW)  
**Responsibility:**
- Query all posts with drafts where `publishedAt <= now`
- For each post, publish **only the most recent draft** (ignore older scheduled versions)
- Trigger all post afterChange hooks (revalidate, search sync, artist projects)
- Handle errors gracefully (log, don't crash job)

**Pseudocode:**
```typescript
export const publishScheduledDrafts: TaskConfig = {
  slug: 'publish-scheduled-drafts',
  handler: async ({ req }) => {
    const now = new Date()
    
    // Find all posts with scheduled publish dates in the past
    const posts = await req.payload.find({
      collection: 'posts',
      where: { _status: { equals: 'draft' } },
      depth: 0,
    })
    
    let publishedCount = 0
    
    for (const post of posts.docs) {
      // Get version history; find latest draft
      const versions = await req.payload.findVersions({
        collection: 'posts',
        where: { parent: { equals: post.id } },
      })
      
      const latestDraft = versions.docs
        .filter(v => v._status === 'draft' && v.publishedAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
      
      if (latestDraft && new Date(latestDraft.publishedAt) <= now) {
        // Publish: transition to published state
        await req.payload.update({
          collection: 'posts',
          id: post.id,
          data: { _status: 'published' },
          // Hooks run automatically; no need to skip
        })
        publishedCount++
      }
    }
    
    return { output: { publishedCount } }
  },
}
```

#### 3. Job Queue Configuration
Add to `payload.config.ts`:
- Import the task
- Register task in `jobs.tasks` array
- Configure `autoRun` to execute job every minute
- Payload's internal job runner handles queuing and execution

**Configuration:**
```typescript
jobs: {
  tasks: [publishScheduledDrafts],
  autoRun: [
    {
      cron: '* * * * *', // Every minute
      queue: 'scheduled-publishing',
      limit: 50, // Process up to 50 jobs per run
    },
  ],
}
```

#### 3. Database Schema
Payload migrations will auto-generate when `schedulePublish: true` is added:
- `_versions.publishedAt` (timestamp, optional)
- `payload_jobs` collection (stores job queue state)

No manual schema edits needed — migrations handle it. Must verify idempotency guards in migration (e.g., `CREATE TABLE IF NOT EXISTS`).

### Data Model

No new fields on Posts itself. All scheduling metadata lives in `_versions` table:

```typescript
// Payload-managed, auto-generated in _versions table:
{
  id: '...',
  parent: 'postId',
  version: 1,
  publishedAt: '2026-09-25T10:00:00Z', // When to publish (optional)
  unpublishedAt: null,                  // When to revert to draft (optional)
  _status: 'draft',
  content: {...},
  // ... all post fields
}
```

### Admin Experience

1. **Draft creation:** Editor saves post as draft (current workflow)
2. **Scheduling:** Sidebar shows two new date/time pickers:
   - "Schedule publish" → date this draft goes live
   - "Schedule unpublish" → date this draft reverts to draft (optional)
3. **Visibility:** Admin list may show "Scheduled" badge or column (depends on Payload UI)
4. **Editing after schedule:** Can edit draft and reschedule as needed
5. **Publication:** At scheduled time, job publishes post automatically

### Job Execution Details

**Task:** `publishScheduledDrafts` (custom, new file)  
**Trigger:** Payload's autoRun cron, every minute  
**Action:** For each post, find latest draft with `publishedAt <= now`, publish it  
**Hooks:** All post afterChange hooks run (revalidate, search sync, artist projects sync, etc.)  
**Error handling:** Log errors, skip failed posts, continue to next

### Multi-Draft Behavior

When editor creates multiple draft versions of the same post with different schedules:

- **v1 (draft):** `publishedAt = Sept 20, 10:00 AM`
- **v2 (draft):** `publishedAt = Sept 25, 10:00 AM`

**Job behavior:** Only **v2** (latest) publishes. When Sept 20 arrives, job finds v1 but v2 is newer, so v1 is skipped.

**Rationale:** Editors expect the most recent work to publish; older versions are editorial iterations, not scheduled content.

**Implementation detail:** Job must sort versions by `updatedAt DESC` and pick first scheduled draft, not iterate all.

## Implementation Checklist

1. **Create job task file:** `src/jobs/tasks/publishScheduledDrafts.ts` with handler logic
2. **Enable `schedulePublish: true`** in Posts.ts versions config
3. **Add jobs queue config** to payload.config.ts (import task, register in jobs.tasks, configure autoRun)
4. **Run migrations:** `pnpm payload migrate:create` to generate schema, then `pnpm payload migrate` to apply
5. **Verify migration:** Check that `_versions.publishedAt` column exists, idempotency guards in place
6. **Test locally:** Schedule post → advance system clock or manually trigger job → verify published
7. **Verify hooks:** Confirm revalidate, search index, artist sync all trigger after publish
8. **Deploy:** Verify job runner spins up on Vercel, check logs for job execution

## Known Limitations & Assumptions

### Admin Permissions
- **Assumption:** All editors with post-create permission can also schedule posts
- **Future refinement:** Add access control if only admins should schedule (e.g., `access.update` hook)

### Multi-Draft Scheduling Behavior
- **Fact:** Payload stores `publishedAt` on each version independently
- **Implementation:** Job queries `WHERE _status='draft' AND publishedAt <= now`, then publishes latest only
- **Testing:** Verify multi-version scenario (edit v1, save v2 with new schedule, advance time → only v2 publishes)

### Admin Calendar/List View
- **Status:** Payload may auto-add "Scheduled" badge or column in Posts list; unknown until implementation
- **Phase 1:** Test what Payload provides; document findings
- **Phase 2:** If insufficient, build custom calendar widget (separate spec)

### Job Runner Reliability
- **Status:** Payload's autoRun is reliable on Next.js servers; on Vercel it runs as part of the deployment
- **No external cron needed:** autoRun is built-in, not dependent on Vercel Cron Functions
- **Monitoring:** Check Payload admin UI → Jobs tab for job execution history and errors

### Phase 1 Scope
- Publish scheduling only (no unpublish, no notifications, no calendar)
- Single-post-per-edit workflow (no bulk scheduling)
- Basic error logging (advanced retry logic deferred to Phase 2)

## Testing Strategy

### Unit Tests
- Job handler correctly parses `publishedAt` timestamps
- Latest draft version is selected (not oldest)
- Draft with `publishedAt` in future is skipped
- Draft with `publishedAt` in past is published

### Integration Tests
- **Publish on schedule:** Schedule post → manually trigger job → verify `_status: published`
- **Latest draft only:** Create v1 (scheduled Sept 20), create v2 (scheduled Sept 25), advance time past Sept 20 → only v2 publishes
- **Hook execution:** After publish, verify revalidate hook ran (check ISR cache), search index updated, artist projects synced
- **Multiple posts same time:** Schedule 3 posts for same time → all publish in single job run
- **Idempotency:** Run job twice in succession → post publishes only once (no duplicates)
- **Error isolation:** Schedule 5 posts, make 1 invalid → other 4 publish, error logged for the 1

### Manual Testing (Local)
1. Create draft post with title "Test Scheduled"
2. Set `scheduledPublishAt` to 1 minute from now
3. Wait for cron to run (or manually trigger job via Payload admin)
4. Verify post is published (check `_status`, check frontend, check revalidation logs)

### Manual Testing (Vercel Preview/Prod)
1. Schedule post with `publishedAt` = next hour
2. Monitor Payload admin → Jobs tab for job execution
3. Wait for scheduled time; verify post goes live on frontend
4. Check search index and ISR cache updated

## Future Enhancements (Phase 2+)

- **Scheduled unpublish:** `unpublishedAt` field to auto-revert posts to draft (separate task)
- **Admin calendar widget:** Visual grid showing scheduled posts by date
- **Bulk reschedule:** Multi-select posts → change all to same schedule date
- **Email notifications:** Alert editors when scheduled post publishes
- **Preview scheduled posts:** Like draft preview, but for scheduled content
- **Advanced retry logic:** Retry failed publishes with exponential backoff
- **Scheduled archive:** Auto-unpublish posts N days after publish (evergreen content management)

## References

- **Payload docs:** [Scheduled Publish](https://payloadcms.com/docs/versions/drafts#scheduled-publish)
- **Payload docs:** [Jobs Queue Overview](https://payloadcms.com/docs/jobs-queue/overview)
- **Payload template:** Website template uses this pattern; see `payload.config.ts` in official repo
- **Related:** docs/ideas.md #41 (Scheduled Publishing v2)

## Questions for Implementation

1. Does Payload 3.90 auto-show a "Scheduled" badge/column in Posts list view, or must we add it?
2. What does Payload's admin UI show when `schedulePublish: true`? (Sidebar pickers? Modal? Field ordering?)
3. Should job handler include logging for troubleshooting, or keep minimal?
4. If job fails on a post (e.g., validation error), should it skip and continue, or halt the job?
5. Do we need an admin permission check, or can all editors schedule posts?
