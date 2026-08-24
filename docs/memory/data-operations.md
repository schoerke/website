# Data Operations

How to read/write production data correctly (Payload Local API vs raw SQL). Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §11.

---

## Payload Local API vs Raw SQL for Prod Data Operations

**The rule (kept in AGENTS.md):** NEVER use raw SQL or `@libsql/client` to copy or write data to production.
Use Payload's Local API. For **reading content data** (artists, repertoires, posts, etc.), prefer what the Local
API returns (small `tsx` read script, `pnpm dump <collection>`, or an existing service/action). Turso CLI remains
appropriate for DB/SQL-specific work — schema inspection, migration verification, row-count checks,
backup/restore/clone, env identity, and queries the Local API can't easily express. Every `turso` command requires
approval per `opencode.json`.

### Why raw SQL is dangerous

Payload CMS is not just a database — it's a system with hooks, lifecycle events, and internal tables that must
all stay in sync. Bypassing the Local API to write SQLite directly means:

- Versions tables (`_posts_v`, `_recordings_v`, etc.) are **never populated** — the admin list view shows nothing
  or ghost entries (this happened 2026-04-27: all 168 posts vanished from admin after a raw-SQL copy).
- The search index (`search` collection) is **never updated**.
- `afterChange` hooks **never run** (search sync, slug generation, etc.).
- Relationship integrity is fragile — foreign key mismatches cause silent failures.

### Correct pattern: migrate data to prod via Local API

```bash
# Run the import/seed script — uses Payload Local API, which runs all hooks
npx tsx scripts/wordpress/importPostsDataset.ts
npx tsx scripts/wordpress/importRecordingsDataset.ts
```

### Correct pattern: delete data from prod via Local API

```typescript
import 'dotenv/config'
import config from '@/payload.config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

// Find records to delete
const results = await payload.find({
  collection: 'recordings',
  where: { artists: { contains: artistId } },
  depth: 0,
  limit: 100,
})

// Delete each one via Local API
for (const doc of results.docs) {
  await payload.delete({ collection: 'recordings', id: doc.id })
}
```

### When raw SQL IS acceptable

- **DB/SQL-specific work where the Local API is the wrong tool:** schema inspection (`PRAGMA table_info(...)`),
  migration verification, row-count checks (`SELECT COUNT(*)`), backup/restore/clone, env identity — with user
  approval (`opencode.json` gates every `turso` command)
- **Deleting orphaned rows** Payload itself cannot see (e.g., `parent_id IS NULL`) — only after verifying they are
  truly orphaned and not real data

**Content data reads (artists, repertoires, posts, etc.) are NOT raw-SQL work** — use the Local API (a `tsx` read
script or `pnpm dump <collection>`), which returns the same shape the app consumes; raw SQL returns storage format.

### Related incidents

- **2026-04-27:** prod admin showed 137 ghost posts (`id: null`), then "No Results" after deleting orphaned
  `_posts_v` rows. Posts had been copied to prod via raw SQL, so Payload hooks never ran and `_posts_v` was never
  populated. Fixed by wiping posts from prod tables and re-importing via Local API (`importPostsDataset.ts`).
  **Always use the Local API for prod data operations.**
