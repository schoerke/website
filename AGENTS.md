# AGENTS.md

## CRITICAL: Database Protection Policy

**RULE: NEVER MODIFY THE DATABASE WITHOUT EXPLICIT USER CONFIRMATION**

This includes:

- **Schema changes** (migrations, field additions/removals, type changes)
- **Data modifications** (updates, deletes, bulk operations)
- **Running migration scripts** (even with backups)
- **Restoring data** from backups
- **Seeding or importing** data
- **Accepting schema push prompts** from Payload CMS or any ORM

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

**2025-11-24: Remote Database Modified Without Verification**

- **What happened:** Made database changes (media seeding, biography updates) on remote Turso database without verifying
  configuration
- **Root cause:** Failed to check `.env` DATABASE_URI before running database operations
- **Impact:** 2 media files uploaded, artist biography data modified on remote development database
- **Prevention:** Added mandatory database environment verification step above

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
- **Imports:** Use ES module syntax; imports are auto-organized
- **Types:** Use TypeScript for all new code
- **React Components:** Always define components using the following pattern:
  - `const ComponentName: React.FC<Props> = (props) => { ... }`
  - Place `export default ComponentName` at the end of the file.
  - Use named types/interfaces for props (e.g., `ComponentNameProps`).
- **Naming:** Use descriptive, camelCase for variables/functions, PascalCase for types/components
- **Error Handling:** Prefer explicit error handling; avoid silent failures
- **Linting:** Follows Next.js, Prettier, and TypeScript ESLint rules
- **Ignore:** build, dist, node_modules, temp, .git, .yarn, .tmp

_This file is for agentic coding agents. Update if project conventions change._

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

### Examples

- ✅ **Temporary**: `tmp/scripts/test-artist-query.ts` - Quick debugging script
- ✅ **Permanent**: `scripts/db/seedArtists.ts` - Well-documented seeding script with JSDoc
- ❌ **Bad**: `scripts/temp-fix-123.ts` - Temporary script in permanent location
