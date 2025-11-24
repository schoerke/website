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
