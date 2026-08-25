# AGENTS.md

## CRITICAL: Database Protection Policy

**RULE: NEVER MODIFY THE DATABASE OR GENERATE CREDENTIALS WITHOUT EXPLICIT USER CONFIRMATION**

**NEVER USE `ksschoerke-development` — IT DOES NOT EXIST. Forget it entirely.** The only databases are:
- **Local `dev.db`** (dev server/MCP/admin — canonical dev)
- **`ksschoerke-production`** (live)

Any `.env`/docs/scripts that reference `ksschoerke-development` are STALE. Never target it, never read it, never
mention it.

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

- ✅ Read operations via **Payload Local API** (`pnpm dump <collection>`, `tsx` read script, existing services/actions)
- ✅ Creating backup files (local copies, e.g. `sqlite3` on exported `.db` — note: `turso db export` requires approval per `opencode.json`)
- ✅ Writing migration scripts without executing them
- ✅ Analyzing data structure
- ✅ Read-only inspection of an **exported** `.db` backup with `sqlite3`

Note: `opencode.json` requires approval for **every `turso` command** (shell, export, import, list) — the permission
layer gates those even though they may be read-only. Prefer Local API reads over `turso db shell`.

**If you violate this policy and cause data loss, immediately:**

1. Acknowledge the mistake
2. Explain what data was affected and on which database (local vs remote)
3. Check if recovery is possible from backups
4. Update these instructions to prevent recurrence

### Available Tooling (check BEFORE writing new scripts)

> **⚠️ READ `MEMORY.md` (the index) FIRST** — it points to the operational lessons, environment facts, the 2026-08-15 prod
> incident, and hard-won workflows. Full learnings live in `docs/memory/`. It is mandatory reading before any database,
> migration, or deployment work.

This project runs on Turso (SQLite), deployed to Vercel. The following tools are already available — prefer them
over writing ad-hoc scripts:

- **Turso CLI** (`turso`, authenticated) — native database operations without touching `.env`:
  - `turso db list` — list databases (dev + prod)
  - `turso db export <db>` — **full SQLite snapshot backup** to a local `.db` file (covers ALL tables, no `.env`
    swap needed; uses CLI credentials)
  - `turso db shell <db>` — interactive SQL shell
  - Databases: `ksschoerke-development`, `ksschoerke-production`
- **`sqlite3`** (macOS built-in) — inspect/query exported `.db` backup files locally (read-only)
- **`payload` CLI** (`pnpm payload ...`) — `migrate:create`, `migrate`, `migrate:status`, `generate:types`,
  `generate:importmap`, `run <script>`
- **`scripts/db/dumpCollection.ts`** (`pnpm dump <collection>`) — per-collection JSON exports to `data/dumps/`

**Rule:** for full-database backups, use `turso db export` — never a hand-rolled script. For read-only
inspection of an exported backup, use `sqlite3`. Only reach for custom scripts when none of these fit.
**Reading content data (artists, repertoires, posts, etc.): use Payload Local API via `pnpm dump <collection>` or a
small `tsx` read script.** Turso CLI is appropriate for DB/SQL-specific work (schema inspection, migration
verification, row-count checks, backup/restore/clone, env identity). Every `turso` command requires approval per
`opencode.json`.

**Note:** `turso db import` creates a **new** database — it does NOT overwrite an existing one. For backup,
restore, clone prod→dev, and schema-parity procedures, see `docs/memory/db-operations.md` (verified methods).

## Operational Knowledge (see MEMORY.md)

**MEMORY.md** is the INDEX of operational lessons, environment facts, and incident history; the authoritative
record lives in `docs/memory/`. It is mandatory reading before any database, migration, or deployment work.

**Payload CMS operational patterns** (migrations, hooks, relationships, admin behaviors, search):
`docs/patterns/payload.md` (loaded automatically via `opencode.json`).

### Always Use Payload Local API for Database Operations

**CRITICAL: NEVER use raw SQL or `@libsql/client` to copy or write data to production.** Always use Payload's
Local API — bypassing it skips hooks, never populates versions tables, and breaks the admin list view.
Full explanation, code patterns, and the 2026-04-27 posts incident: docs/memory/data-operations.md.

**CRITICAL: for reading content data (artists, repertoires, posts, etc.), prefer what Payload's Local API returns**
(a small `tsx` read script, `pnpm dump <collection>`, or an existing service/action). **Turso CLI is appropriate for
DB/SQL-specific work** — schema inspection (`PRAGMA`), migration verification, row-count checks, backup/restore/
clone, env identity, and queries the Local API can't easily express. Every `turso` command still requires approval
per `opencode.json`.

### Payload CMS + SQLite: Array Field Renames

**CRITICAL: Read this before renaming any array/block/relationship field in a Payload collection.** Each
array field has its own SQLite table; a naive rename + schema push DROPS the old table and loses data. The
correct approach is a Payload migration file (not a pre-migration script). Full walkthrough + the 2026-04-18
video-loss incident: docs/memory/migrations.md.

### Library-Specific Knowledge

- Payload search plugin + localization: docs/memory/libraries.md
- WordPress migration data integrity: docs/memory/libraries.md
- WordPress migration file uploads: docs/memory/libraries.md
- WordPress filename timestamp postfixes: docs/memory/libraries.md
- Vercel Blob storage/bandwidth: docs/memory/libraries.md

### Historical Incidents (pre-2026-08)

Full incident log: docs/memory/incidents/. Includes: unauthorized token generation (2025-11-30), employee migration
FK failures (2025-11-30), unverified remote DB modifications (2025-11-24), posts versions table emptied
(2026-04-27), video data lost on array rename (2026-04-18).

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
- **NEVER run `git push` — especially to `main` — without explicit user confirmation.** Pushing is
  a production-affecting action gated like a deployment: prepare the change, let the user review and
  test, and let the user decide when it is pushed. "Tests passed" or "pre-push hooks are green" is NOT
  consent to push. The same applies to `git commit`: stage nothing, commit nothing, without the user's
  explicit word.
- **ALWAYS wait for user testing and approval before running `git commit`.**
- After making changes, inform the user what was changed and wait for them to test and approve.
- Only commit when the user explicitly asks you to commit or confirms the changes work correctly.
- If you accidentally commit without approval, immediately offer to roll back with `git reset --soft HEAD~1`.
- If you accidentally push without approval, do NOT force-push or rewrite history; tell the user
  immediately and offer `git revert` as the corrective option.

## Build, Lint, and Format Commands

- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format` (runs `oxfmt --write .`)
- **Format check:** `pnpm exec oxfmt --check <paths>` before committing
- **Test:** `pnpm test` (run tests), `pnpm test:watch` (watch mode), `pnpm test:ui` (test UI), `pnpm test:coverage`
  (coverage report)

## Code Style Guidelines

- **Indentation:** 2 spaces (see .editorconfig)
- **Line endings:** LF, UTF-8, trim trailing whitespace, insert final newline
- **Formatting:**
  - Use oxfmt (`.oxfmtrc.json`, not Prettier — do NOT run `prettier`):
    - Single quotes
    - No semicolons
    - Tab width 2
    - Trailing commas (es5)
- **Imports:**
  - **ALWAYS place imports at the very top of the file** (before JSDoc comments, before any code)
  - Use ES module syntax; imports are auto-organized by oxfmt
  - Group order: external dependencies, then internal imports (@ aliases)
- **Types:** Use TypeScript for all new code
  - **NEVER use `any` type** - it defeats the purpose of TypeScript's type safety
  - **NEVER use `as any` casts** - this bypasses type checking and hides errors
  - Define proper interfaces for complex types instead of using `any`
  - For test data with intentionally missing fields, use empty strings or create proper partial types
  - Examples of what NOT to do:
    - ❌ `href: any` - Define proper interface instead
    - ❌ `content?: any` - Use actual type from payload-types
    - ❌ `undefined as any` - Use empty strings for falsy validation tests
    - ❌ `value as any` - Use proper type narrowing or type guards
- **React Components:** See dedicated "React Component Pattern" section below for detailed guidelines.
- **Naming:** Use descriptive, camelCase for variables/functions, PascalCase for types/components
- **Error Handling:** Prefer explicit error handling; avoid silent failures
- **Linting:** Runs `oxlint` (`pnpm lint`, config `oxlint.config.ts`)
- **Ignore:** build, dist, node_modules, temp, .git, .yarn, .tmp

## React Component Pattern

**CRITICAL: This is the standard pattern for ALL React components in this project.** Full pattern:
`docs/patterns/react-components.md` (loaded automatically via `opencode.json`). Core rules:

- `'use client'` first if client component; imports at very top
- `const ComponentName: React.FC<ComponentNameProps> = (props) => { ... }` — never function declarations
- Props via named `ComponentNameProps` interface; default export at end of file
- Async data-fetching server components: `const ComponentName = async (props: Props)` (no `React.FC`)
- Multi-component files use named exports only when consumed together

## Data Fetching Pattern

**CRITICAL: Use Server Actions for client component data fetching, NEVER REST API `fetch()` calls.** Full
pattern: `docs/patterns/data-fetching.md` (loaded automatically via `opencode.json`). Core rules:

- Client data fetching → server action in `src/actions/[resource].ts` using Payload Local API
- Always set `depth` for relationship population
- Services in `src/services/`; actions call services

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
- **Include package.json scripts** for commonly used scripts (e.g., `pnpm dump artists`)

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
