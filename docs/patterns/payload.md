# Payload CMS Operational Patterns

Payload-specific knowledge that bit us (and patterns that work). Complements `MEMORY.md` (incidents/procedures)
and `docs/turso-operations.md` (DB ops). Loaded every session via `opencode.json`.

---

## Migrations

### The workflow that works
- Dev: edit collection config → `pnpm dev` → accept dev schema push (dev only).
- Generate migration: `pnpm payload migrate:create <name>` — does NOT connect to DB, only diffs snapshots + writes
  `.ts`/`.json`.
- Review the generated `up()`/`down()` SQL. Pre-flight against a local copy of a prod snapshot before trusting it.
- `pnpm payload migrate` on the server (via `build:ci`) applies pending migrations to prod.

### Idempotency is MANDATORY
`build:ci` runs migrations on EVERY Vercel build (previews included) → a migration can re-run against an
already-migrated DB. Guard every `up()`/`down()`:

```typescript
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_rels') WHERE name = 'repertoire_id'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}
// up(): if (await alreadyApplied(db)) return
// down(): if (!(await alreadyApplied(db))) return
```
Use `DROP TABLE IF EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` everywhere.

### The SQLite FK / ALTER trap
`ALTER TABLE ... ADD COLUMN ... REFERENCES x(id)` creates an FK with **NO ACTION** (no cascade). Payload's schema
push may add a column with **no FK at all**. To get `ON DELETE CASCADE` you must **recreate the table** (create
`__new_...`, `INSERT ... SELECT`, drop, rename) — see
`src/migrations/20260815_125014_artist_repertoire_ordering.ts`.

**Dev push ≠ migration output.** Dev's `pushDevSchema` uses ALTER (no FK); the migration file creates the FK
properly. So dev and prod can legitimately differ in FK presence. Verify against `payload-generated-schema.ts`,
not dev's live schema.

### `dev|-1` marker
- Written by `pushDevSchema` on any dev-mode connection.
- Makes `payload migrate` show the interactive "data loss" prompt, which **silently cancels in CI** → migration
  skipped.
- Delete if present: `echo "DELETE FROM payload_migrations WHERE name='dev';" | turso db shell <db>`
- Prevent: prod-targeting scripts must run with `NODE_ENV=production` (skips the push).

---

## Hooks

### Errors: use APIError, not Error
A plain `throw new Error('msg')` surfaces as generic *"Something went wrong"* in the admin. Show the real message:
```typescript
import { APIError } from 'payload'
throw new APIError('Your real message', 400, undefined, true) // isPublic: true
```

### afterChange runs AFTER commit
`afterChange` fires post-commit. Throwing there shows an error but the write already happened. For validation that
must reject before any write, use a field `validate` or `beforeChange`.

### Admin relationship chips remove optimistically
Clicking ✕ on a relationship chip updates client state immediately — no API call until **Save**. Hooks only fire
on Save. Don't expect a toast at chip-removal time.

### Nested update context
`payload.update({ ... , context })` flows into `req.context` in hooks. Pass `context: { syncingX: true }` to
prevent loops when a hook writes the same collection. Revalidation hooks check `req.context?.skipRevalidation` —
scripts must pass `context: { skipRevalidation: true }` (revalidatePath throws outside Next server context).

---

## Relationships

### Value shapes
- Non-polymorphic hasMany saves/reads as **`number[]`** (plain IDs).
- Polymorphic uses `{ relationTo, value }` objects.
- Admin form data arrives as `{ relationTo, value }`; `originalDoc` from Local API may be populated `{ id, ... }`.
  Handle all three when reading relationship values in hooks/validators.

### Order preservation
`payload.find` does NOT preserve `id in [...]` query order. `getArtistBySlug` does manual project + repertoire
population with a Map to keep relationship-array order.

### maxRows is UI-only; add server validate
`maxRows` on a relationship field is not enforced by the API. Add a `validate` that checks `Array.isArray(value) &&
value.length > max`.

---

## Local API vs raw SQL

**NEVER raw SQL / `@libsql/client` to copy or write data to prod.** Local API runs hooks, populates versions
tables (`_posts_v` etc.), updates search. Raw copies skip all of it → admin list breaks (2026-04-27 incident).
Full detail: `MEMORY.md` §11.

For **reading content data**, prefer the Local API (`pnpm dump <collection>`, `tsx` read script, service/action).
Turso stays right for DB/SQL-specific work (schema inspection, migration verification, counts, backups, env
identity) — every `turso` command requires approval per `opencode.json`.

---

## Search plugin

`@payloadcms/plugin-search`: `localize: true` localizes the SEARCH collection, not sources. One `afterChange`
hook per API request using `req.locale`. To index both locales, create EN then update DE (two search records).
When confused, read the plugin source — don't guess config.

---

## Generated files to keep in sync
- `src/payload-types.ts` — `pnpm payload generate:types`
- `src/app/(payload)/admin/importMap.js` — `pnpm payload generate:importmap` (after adding/removing admin
  components)
- `src/payload-generated-schema.ts` — `pnpm payload generate:db-schema` (drizzle schema; compare migrations
  against this, not dev)
