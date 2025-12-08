# AGENTS.md

## CRITICAL: Database Protection Policy

**RULE: NEVER MODIFY THE DATABASE OR GENERATE CREDENTIALS WITHOUT EXPLICIT USER CONFIRMATION**

This includes:

- **Schema changes** (migrations, field additions/removals, type changes)
- **Data modifications** (updates, deletes, bulk operations)
- **Running migration scripts** (even with backups)
- **Restoring data** from backups
- **Seeding or importing** data
- **Accepting schema push prompts** from Payload CMS or any ORM
- **Generating database credentials** (auth tokens, API keys, passwords)

### MANDATORY: Database Environment Verification

**BEFORE ANY DATABASE OPERATION (including read operations for context):**

1. **CHECK** the current database configuration in `.env`:
   - Run `cat .env | grep DATABASE_URI`
   - Identify if it's local (file:// or local.db) or remote (libsql://, postgres://, etc.)
2. **VERIFY** with the user which database should be used for the current task
3. **CONFIRM** the database environment before proceeding

**NEVER ASSUME** the database configuration. Always verify first.

### Required Process for ANY Database Operation:

1. **VERIFY DATABASE** - Check `.env` and confirm with user which database to use
2. **STOP** - Do NOT run the command yet
3. **EXPLAIN** exactly what will change in the database AND which database (local vs remote)
4. **SHOW** the specific command/script you want to run
5. **LIST** any data that will be deleted, modified, or migrated
6. **WAIT** for explicit user response: "yes, go ahead" or "proceed"
7. Only after receiving explicit approval, execute the operation

### Examples of Operations That Require Approval:

- ❌ Running `pnpm payload migrate` or accepting schema push prompts
- ❌ Running any script in `scripts/db/` (seed, restore, migrate, etc.)
- ❌ Executing `payload.update()`, `payload.delete()`, or bulk operations
- ❌ Running SQL queries that modify data
- ❌ Changing schema in collection config files and restarting the server (triggers migrations)
- ❌ **Generating credentials:** `turso db tokens create`, `vercel env pull`, API key generation, password generation

### What You CAN Do Without Approval:

- ✅ Read operations (dumps, queries, API calls that only read)
- ✅ Creating backup files
- ✅ Writing migration scripts without executing them
- ✅ Analyzing data structure

**If you violate this policy and cause data loss, immediately:**

1. Acknowledge the mistake
2. Explain what data was affected and on which database (local vs remote)
3. Check if recovery is possible from backups
4. Update these instructions to prevent recurrence

### Incident Log

**2025-11-30: Unauthorized Database Token Generation**

- **What happened:** Agent generated a new Turso database auth token without user permission
- **Root cause:** When cleaning up R2 environment variables, `DATABASE_AUTH_TOKEN` was accidentally removed from `.env`.
  Agent ran `turso db tokens create` without asking first.
- **Impact:** Created a new token that could have invalidated Vercel deployment or other environments using the old
  token
- **Resolution:** User provided original token, which was restored to `.env`
- **Prevention:**
  - **NEVER generate new database credentials without explicit permission**
  - When environment variables are missing, ask user to provide them - don't generate new ones
  - Add to database protection policy: Credential generation requires explicit approval
  - Be more careful with grep filters when removing env vars (check each line individually)

**2025-11-30: Foreign Key Constraint Errors During Employee Migration**

- **What happened:** Employee migration failed with "FOREIGN KEY constraint failed" errors
- **Root cause:** `media-id-map.json` contained outdated Payload image IDs that didn't exist in database
- **Impact:** Migration failed for all 4 employees until image IDs were corrected
- **Resolution:**
  1. Uploaded missing employee images to Vercel Blob
  2. Updated `media-id-map.json` with correct database IDs
  3. Verified IDs existed before re-running migration
- **Prevention:** Always verify foreign key references exist in database before running migrations that create
  relationships

**2025-11-24: Remote Database Modified Without Verification**

- **What happened:** Made database changes (media seeding, biography updates) on remote Turso database without verifying
  configuration
- **Root cause:** Failed to check `.env` DATABASE_URI before running database operations
- **Impact:** 2 media files uploaded, artist biography data modified on remote development database
- **Prevention:** Added mandatory database environment verification step above

## Environment Variable Management Policy

**RULE: NEVER GENERATE OR MODIFY CREDENTIALS WITHOUT EXPLICIT USER CONFIRMATION**

### When Environment Variables Are Missing:

1. **STOP** - Do NOT generate new credentials
2. **ASK** the user to provide the missing value
3. **EXPLAIN** what the variable is used for
4. **WAIT** for user to provide the actual value

### Examples of Operations That Require Approval:

- ❌ `turso db tokens create` - Generates new database auth token
- ❌ `vercel env pull` - Pulls environment variables (may overwrite local)
- ❌ Any command that generates API keys, passwords, secrets, or tokens
- ❌ Modifying `.env` with generated values instead of user-provided values

### What You CAN Do:

- ✅ Read `.env` to check what variables exist
- ✅ Compare `.env` with `.env.example` to find missing variables
- ✅ Ask user for missing credential values
- ✅ Add user-provided values to `.env`

### When Cleaning Up Environment Variables:

**CRITICAL: Be surgical, not broad, when removing environment variables**

❌ **BAD - Too broad, will remove unrelated variables:**

```bash
cat .env | grep -v -E "CLOUDFLARE|S3_|R2" > .env.tmp
```

✅ **GOOD - Explicit list of variables to remove:**

```bash
# Remove specific R2 variables one by one
grep -v "CLOUDFLARE_S3_BUCKET" .env | \
grep -v "CLOUDFLARE_S3_ACCESS_KEY" | \
grep -v "CLOUDFLARE_SECRET" | \
grep -v "CLOUDFLARE_S3_API_ENDPOINT" | \
grep -v "NEXT_PUBLIC_S3_HOSTNAME" > .env.tmp
```

✅ **BETTER - Show user what will be removed and ask for confirmation:**

```bash
# List what will be removed
echo "Will remove these variables:"
grep -E "CLOUDFLARE|R2|S3_" .env
# Then ask user: "Should I proceed with removing these?"
```

**If you accidentally remove a credential:**

1. **STOP immediately** - Do not generate a new one
2. **Ask user** to provide the original value
3. **Restore** the user-provided value to `.env`
4. **Document** what happened in the incident log

## Git Commit Policy

- **NEVER commit code without explicit user confirmation.**
- **ALWAYS wait for user testing and approval before running `git commit`.**
- After making changes, inform the user what was changed and wait for them to test and approve.
- Only commit when the user explicitly asks you to commit or confirms the changes work correctly.
- If you accidentally commit without approval, immediately offer to roll back with `git reset --soft HEAD~1`.

## Build, Lint, and Format Commands

- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Test:** `pnpm test` (run tests), `pnpm test:watch` (watch mode), `pnpm test:ui` (test UI), `pnpm test:coverage`
  (coverage report)

## Code Style Guidelines

- **Indentation:** 2 spaces (see .editorconfig)
- **Line endings:** LF, UTF-8, trim trailing whitespace, insert final newline
- **Formatting:**
  - Use Prettier (`pnpm format`):
    - Single quotes
    - No semicolons
    - Trailing commas
    - Print width: 120
    - Organize imports (prettier-plugin-organize-imports)
    - Tailwind CSS plugin enabled
- **Imports:**
  - **ALWAYS place imports at the very top of the file** (before JSDoc comments, before any code)
  - Use ES module syntax; imports are auto-organized by Prettier
  - Group order: external dependencies, then internal imports (@ aliases)
- **Types:** Use TypeScript for all new code
- **React Components:** See dedicated "React Component Pattern" section below for detailed guidelines.
- **Naming:** Use descriptive, camelCase for variables/functions, PascalCase for types/components
- **Error Handling:** Prefer explicit error handling; avoid silent failures
- **Linting:** Follows Next.js, Prettier, and TypeScript ESLint rules
- **Ignore:** build, dist, node_modules, temp, .git, .yarn, .tmp

_This file is for agentic coding agents. Update if project conventions change._

## React Component Pattern

**CRITICAL: This is the standard pattern for ALL React components in this project.**

### Required Component Structure

```typescript
import statements...

'use client' // Only if client component (place AFTER imports)

interface ComponentNameProps {
  prop1: Type1
  prop2?: Type2 // Optional props marked with ?
}

const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // Component logic
  return (
    // JSX
  )
}

export default ComponentName
```

### Key Rules

1. **Import Placement:**
   - **ALWAYS place imports at the very top of the file**
   - Imports come before 'use client' directive, before JSDoc comments, before any code
   - This is a critical rule for code organization

2. **Component Declaration:**
   - Always use: `const ComponentName: React.FC<PropsType> = (props) => { ... }`
   - Never use function declarations: `function ComponentName() { ... }`
   - Never export inline: `export const ComponentName = ...`

3. **Props Interface:**
   - Always define a named interface: `ComponentNameProps`
   - Place it directly above the component declaration
   - Use descriptive names that match the component name

4. **Export Pattern:**
   - Always use default export: `export default ComponentName`
   - Place export at the end of the file (after component definition)
   - **Exception:** Files with multiple related components (e.g., tab components, form sections) may use named exports
     when consumed together

5. **Helper Functions:**
   - Define helper functions outside the component (above it)
   - Add return type annotations: `function helper(x: number): string { ... }`
   - Use `function` keyword for top-level helpers, not arrow functions

6. **Client vs Server:**
   - Add `'use client'` directive only when necessary (hooks, event handlers, browser APIs)
   - Place 'use client' AFTER imports
   - Server components are the default (no directive needed)

### Examples

**✅ CORRECT - Client Component:**

```typescript
'use client'

import { useState } from 'react'

interface CounterProps {
  initialValue?: number
}

const Counter: React.FC<CounterProps> = ({ initialValue = 0 }) => {
  const [count, setCount] = useState(initialValue)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}

export default Counter
```

**✅ CORRECT - Server Component with Helper:**

```typescript
import { Post } from '@/payload-types'

interface PostListProps {
  posts: Post[]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

const PostList: React.FC<PostListProps> = ({ posts }) => {
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <time>{formatDate(post.createdAt)}</time>
        </div>
      ))}
    </div>
  )
}

export default PostList
```

**❌ WRONG - Function Declaration:**

```typescript
// DON'T DO THIS
export function ComponentName(props: Props) {
  return <div>...</div>
}
```

**❌ WRONG - Inline Named Export:**

```typescript
// DON'T DO THIS
export const ComponentName: React.FC<Props> = (props) => {
  return <div>...</div>
}
```

**❌ WRONG - Export Before Definition:**

```typescript
// DON'T DO THIS
export default ComponentName

const ComponentName: React.FC<Props> = (props) => {
  return <div>...</div>
}
```

### Compound Component Pattern

For components that use the compound pattern (like `NewsFeed.Server`, `NewsFeed.Client`):

**File: `NewsFeedServer.tsx`**

```typescript
const NewsFeedServer: React.FC<NewsFeedServerProps> = (props) => {
  // ...
}

export default NewsFeedServer
```

**File: `index.tsx`**

```typescript
import NewsFeedServer from './NewsFeedServer'
import NewsFeedClient from './NewsFeedClient'

const NewsFeed = {
  Server: NewsFeedServer,
  Client: NewsFeedClient,
}

export { NewsFeed }
export default NewsFeed
```

### Multi-Component Files (Exception)

For files containing multiple related components that are consumed together (like tab content):

**File: `ArtistTabContent.tsx`**

```typescript
'use client'

// Biography Tab
interface BiographyTabProps {
  content: Artist['biography']
  quote?: string | null
}

export const BiographyTab: React.FC<BiographyTabProps> = ({ content, quote }) => {
  return <div className="prose">{/* ... */}</div>
}

// Repertoire Tab
interface RepertoireTabProps {
  repertoires: Repertoire[]
}

export const RepertoireTab: React.FC<RepertoireTabProps> = ({ repertoires }) => {
  return <div>{/* ... */}</div>
}

// More tab components...
```

**Usage:**

```typescript
import { BiographyTab, RepertoireTab } from './ArtistTabContent'

// Use multiple components together
<BiographyTab content={artist.biography} />
<RepertoireTab repertoires={repertoires} />
```

**When to use multi-component files:**

- Components are closely related (e.g., tabs, form sections, card variants)
- Always consumed together in the same parent component
- Sharing types or helper functions specific to that domain
- **Not** for general utility components or unrelated components

### When to Deviate

**NEVER.** Always follow this pattern unless explicitly instructed otherwise by the user.

## Data Fetching Pattern

**CRITICAL: Use Server Actions for client component data fetching, NEVER use REST API fetch() calls.**

**See `docs/server-actions-pattern.md` for comprehensive guide with examples.**

### Why Server Actions?

- **Better Performance:** Uses Payload's Local API (direct database access) instead of HTTP requests
- **Type Safety:** Full TypeScript types from services
- **Relationship Population:** Easy to use `depth` parameter for nested data
- **Simplified Architecture:** No need to maintain REST API endpoints
- **Next.js Best Practice:** Follows official Next.js 13+ App Router patterns

### When to Use Server Actions

✅ **Always use server actions for:**

- Client components fetching data on mount
- Lazy-loaded data (tabs, accordions, infinite scroll)
- Form submissions
- Any data operation from a client component

❌ **Never use REST API fetch() for:**

- Data fetching in client components
- Relationship queries requiring `depth` parameter
- Operations that could use Local API

### Implementation Pattern

**1. Create a Server Action** (`src/actions/[resource].ts`):

```typescript
'use server'

import { getResourcesByFilter } from '@/services/resource'

/**
 * Server action to fetch resources by filter.
 * Uses Payload Local API for better performance than REST API calls.
 *
 * @param options - Filter options
 * @returns Promise resolving to filtered resources with populated relationships
 */
export async function fetchResources(options: { filterId?: string; limit?: number; locale?: 'de' | 'en' }) {
  return await getResourcesByFilter({
    filterId: options.filterId,
    limit: options.limit || 100,
    locale: options.locale || 'de',
  })
}
```

**2. Use in Client Component:**

```typescript
'use client'

import { fetchResources } from '@/actions/resources'
import { useEffect, useState } from 'react'

const ResourceList: React.FC<ResourceListProps> = ({ filterId }) => {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadResources() {
      try {
        const result = await fetchResources({ filterId, locale: 'en' })
        setResources(result.docs)
      } catch (error) {
        console.error('Failed to fetch resources:', error)
      } finally {
        setLoading(false)
      }
    }
    loadResources()
  }, [filterId])

  // Render resources...
}
```

### Service Layer Guidelines

**Always set appropriate `depth` parameter:**

```typescript
// ✅ CORRECT - Populates image relationships
export const getFilteredPosts = async (options: FilterOptions) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: buildWhereClause(options),
    depth: 1, // Populates first level of relationships (images, authors, etc.)
    locale: options.locale || 'de',
  })
}

// ❌ WRONG - Images won't populate, will be IDs only
export const getFilteredPosts = async (options: FilterOptions) => {
  const payload = await getPayload({ config })
  return await payload.find({
    collection: 'posts',
    where: buildWhereClause(options),
    // Missing depth parameter!
    locale: options.locale || 'de',
  })
}
```

### Real Examples from This Project

**Before (REST API - WRONG):**

```typescript
// ❌ SearchProvider.tsx (old)
const res = await fetch(`/api/employees?locale=${locale}&limit=100`)
const data = await res.json()
```

**After (Server Action - CORRECT):**

```typescript
// ✅ SearchProvider.tsx (new)
import { fetchEmployees } from '@/actions/employees'
const result = await fetchEmployees({ locale, limit: 100 })
```

**Benefits:**

- No manual URL construction
- Type-safe parameters and response
- Uses Payload Local API internally
- Automatically handles errors consistently

### Migration Checklist

When converting REST API calls to server actions:

1. ✅ Create server action in `src/actions/[resource].ts`
2. ✅ Import and call from existing service functions
3. ✅ Add `depth` parameter if relationships need population
4. ✅ Update client component to use server action
5. ✅ Remove REST API endpoint if no longer needed
6. ✅ Update tests to mock server action instead of fetch()
7. ✅ Verify relationship data populates correctly

## Library-Specific Knowledge

### Payload CMS Search Plugin with Localization

**Critical Understanding:** When using `@payloadcms/plugin-search` with localized collections:

1. **How it works:**
   - Setting `localize: true` makes the SEARCH collection itself localized (not the source collections)
   - The plugin's `afterChange` hook fires once per API request, using `req.locale`
   - Each search record is created with a specific `locale` parameter
   - To index content in multiple locales, you need separate API calls for each locale

2. **Correct implementation:**

   ```typescript
   // Create English version
   const doc = await payload.create({
     collection: 'artists',
     data: artistData,
     locale: 'en', // Explicitly set locale
   })

   // Update German version (adds second locale to same document)
   await payload.update({
     collection: 'artists',
     id: doc.id,
     data: { biography: germanBiography },
     locale: 'de', // Explicitly set different locale
   })

   // This creates TWO search records: one for EN, one for DE
   ```

3. **When confused about plugin behavior:**
   - DO NOT guess or experiment with config options
   - Check the plugin's source code on GitHub: `packages/plugin-search/src/`
   - Look for official template examples that use the plugin
   - Read the actual implementation, not just type definitions

### WordPress Migration Data Integrity

**Critical Rule:** When migrating data from WordPress, **preserve the original data structure** unless explicitly
instructed otherwise.

**Example incident (2025-11-25):**

- Jonian Ilias Kadesha had `['Violin', 'Chamber Music']` in WordPress
- Agent attempted to filter out "Chamber Music" globally, affecting ALL artists
- **Correct approach:** Only apply fixes to specific artists when explicitly requested
- **Never make broad assumptions** about data cleanup during migrations

**Guidelines:**

1. **Migrate data as-is** - Don't assume certain values are "wrong" or should be filtered
2. **Fix specific records** - If one artist needs correction, create a targeted fix script
3. **Ask before cleanup** - If you think data should be transformed, ask the user first
4. **Document exceptions** - If an artist needs special handling, document why in the migration script

### WordPress Migration File Uploads

**Critical Rule:** Always verify that media files are uploaded to Payload BEFORE running migrations that reference them.

**Common Issue Pattern (2025-11-30):**

Migration fails with "FOREIGN KEY constraint failed" when trying to link to images that don't exist.

**Root Causes:**

1. `media-id-map.json` contains IDs from a previous/different database state
2. Files were downloaded but never uploaded to current storage (Vercel Blob)
3. Attachment IDs in WordPress XML don't resolve to actual files

**Resolution Process:**

1. **Check existing uploads:**

   ```bash
   # Query database to see what's actually there
   payload.count({ collection: 'images' })
   ```

2. **Verify ID mapping:**

   ```bash
   # Check if mapped IDs exist in database
   cat media-id-map.json | jq '.["filename.jpg"]'  # Get mapped ID
   # Then verify that ID exists in images collection
   ```

3. **Upload missing files:**

   ```typescript
   await payload.create({
     collection: 'images',
     data: { alt: 'Description' },
     filePath: './path/to/file.jpg',
   })
   ```

4. **Update mapping:**
   - Update `media-id-map.json` with correct IDs from database
   - Re-run migration after verification

**Prevention:**

- Always run a query to list existing image IDs before migration
- Verify all referenced IDs exist in database
- Upload ALL media files before running content migrations
- Keep `media-id-map.json` in sync with actual database state

### WordPress Filename Timestamp Postfixes

**Critical Rule:** WordPress adds timestamp postfixes to filenames when images are edited or re-uploaded. Migration
scripts MUST clean these postfixes to avoid cluttering the database.

**Common Pattern (2025-11-30):**

WordPress adds `-e[timestamp]` to filenames:

- `Mario-Venzago-1_c-Alberto-Venzago-e1762933634869.jpg`
- `Claire-Huangci_IMG_2143-Mateusz-Zahora-scaled-e1734089581370.jpg`

Without cleaning, the database accumulates filenames with timestamp postfixes that require manual cleanup.

**Solution:**

All migration scripts now use `cleanWordPressFilename()` utility from `scripts/wordpress/utils/fieldMappers.ts`:

```typescript
import { cleanWordPressFilename } from './utils/fieldMappers'

// Clean filename before lookup
let filename = new URL(attachmentUrl).pathname.split('/').pop()
filename = cleanWordPressFilename(filename)
```

**Files Updated (2025-11-30):**

- `scripts/wordpress/utils/fieldMappers.ts` - Added `cleanWordPressFilename()` utility
- `scripts/wordpress/migrateArtists.ts` - Cleans featured images, PDFs, ZIPs
- `scripts/wordpress/migrateEmployees.ts` - Cleans employee images
- `scripts/wordpress/utils/uploadLocalMedia.ts` - Cleans filenames before upload
- `scripts/wordpress/utils/downloadMedia.sh` - Cleans filenames during download

**Prevention:**

- All future WordPress migrations will automatically clean timestamp postfixes
- No manual cleanup required after migrations
- Database will contain clean, descriptive filenames

### Vercel Blob Storage and Bandwidth Management

**Critical Understanding (2025-11-30):** Vercel Blob has a 10 GB/month bandwidth limit on the free tier. Large files
like ZIP archives can quickly exhaust this limit.

**Current Status:**

- 866 MB / 10 GB bandwidth used (8.6%)
- 139 files totaling 731.55 MB stored
- **21 ZIP files: 721.93 MB** (artist photo galleries, 40-60 MB each)
- Images: ~8 MB (JPG, WEBP, PNG)
- PDFs: ~4 MB

**Issue:**

- Artist gallery ZIP downloads consume significant bandwidth
- ~12 full downloads of all galleries would exhaust monthly limit
- Large files (>10 MB) should not be stored in Vercel Blob

**Recommendations:**

1. **For large downloads (ZIPs, large PDFs):** Use Cloudflare R2 (unlimited egress bandwidth)
2. **For images:** Vercel Blob is fine (small files, Next.js optimization)
3. **Monitor bandwidth:** Check Vercel dashboard regularly during development

**Prevention:**

- Always analyze storage before uploading large files
- Use `tmp/analyzeBlobUsage.ts` to audit Blob storage
- Consider bandwidth impact of file downloads
- See `docs/todo.md` for detailed migration plan

## Library Installation Policy

- **NEVER install new libraries or dependencies without explicit user confirmation.**
- **ALWAYS ask for user approval before running any package manager command (e.g., pnpm, npm, yarn, pip, etc.) that
  would add, remove, or update dependencies.**
- If a new library is required for a solution, clearly explain why and request permission before proceeding.

## Script Management Policy

### Temporary Scripts

- **Use the `tmp/` folder** for all temporary, intermediate, or experimental scripts
- **Clean up when finished** - Delete temporary scripts after use or when debugging is complete
- **Never commit temporary scripts** - The `tmp/` folder (except README.md) is ignored by Git
- If a temporary script becomes permanent, move it to `scripts/` and add comprehensive JSDoc

### Permanent Scripts (in `scripts/` folder)

- **Add comprehensive JSDoc** to all permanent scripts with:
  - File-level description explaining purpose and usage
  - Function-level documentation for all exported functions
  - Usage examples with bash commands
  - Environment variable requirements
  - Cross-references to related scripts using `@see` tags
- **Follow naming conventions**: `verbNoun.ts` (e.g., `seedArtists.ts`, `dumpCollection.ts`)
- **Include package.json scripts** for commonly used scripts (e.g., `pnpm seed:all`)

### CRITICAL: Always Load Environment Variables

**RULE: ALL scripts that use Payload, database connections, or environment variables MUST import `dotenv/config` at the
top:**

```typescript
// ✅ CORRECT - Always include this as the first import
import 'dotenv/config'
import config from '@/payload.config'
import { getPayload } from 'payload'

// Rest of your imports and code...
```

**Why this matters:**

- Payload requires `PAYLOAD_SECRET` from `.env`
- Database connections need `DATABASE_URI` and `DATABASE_AUTH_TOKEN`
- Without this import, scripts will fail with "missing secret key" or connection errors
- This applies to ALL scripts in both `tmp/` and `scripts/` directories

**Common mistake pattern:**

```typescript
// ❌ WRONG - Will fail with "missing secret key"
import config from '@/payload.config'
import { getPayload } from 'payload'
// Missing dotenv/config!
```

### Examples

- ✅ **Temporary**: `tmp/scripts/test-artist-query.ts` - Quick debugging script
- ✅ **Permanent**: `scripts/db/seedArtists.ts` - Well-documented seeding script with JSDoc
- ❌ **Bad**: `scripts/temp-fix-123.ts` - Temporary script in permanent location
