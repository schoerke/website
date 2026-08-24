# Gotchas

Hard-won facts and never-again policies. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §9, §10.

---

## Facts (severity-tagged)

- **[CRITICAL]** **`turso db import` creates a NEW database; it cannot overwrite an existing one.**
  (Confirmed in AGENTS.md.)
- **[WARNING]** **`sqlite3 .dump` emits `unistr()`** — unsupported by Turso's server SQLite build. Don't pipe
  dumps into `turso db shell`.
- **[WARNING]** **`tsx` does not set `NODE_ENV`.** Scripts default to dev-mode connections → `pushDevSchema` on
  connect. Always set `NODE_ENV=production` for prod-targeting scripts.
- **[CRITICAL]** **`dev|-1` in `payload_migrations` = interactive prompt in `migrate` = silent skip in CI.**
  Keep it deleted.
- **[CRITICAL]** **Preview builds run migrations on prod** (by design). This is safe ONLY if migrations are
  idempotent.
- **[WARNING]** **`pnpm ci` is reserved** (clean install). Use `build:ci`, invoked as `pnpm run build:ci`.
- **[WARNING]** **Admin relationship chips remove optimistically** — client-only until Save. Hooks fire on Save.
- **[WARNING]** **Plain `Error` from hooks → generic toast.** Use `APIError(msg, 400, undefined, true)`.
- **[WARNING]** **Admin submits non-polymorphic hasMany relationship values as plain ID arrays** (`number[]`), NOT
  `{relationTo, value}`. The `{relationTo, value}` form is for polymorphic relationships only.
- **[WARNING]** **`getArtistBySlug` does manual project + repertoire population** (second/third queries) to preserve
  relationship-array order — Payload does not preserve `id in [...]` query order.
- **[CRITICAL]** **Drafts collections: `payload.update` writes a VERSION, not the live row.** Admin reads
  versions, frontend reads live. Live rows can be wiped while versions survive → content present in admin,
  invisible on frontend (2026-08-24, post 215 Poltéra/Juho). To write/promote to live via Local API, pass
  `_status: 'published'` (and the slug) in the update.
  (see docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md)
- **[INFO]** **Published slug edits via Local API need the explicit slug passed; the `createSlugHook` preserves a
  submitted `value` on update** but regenerates only on create/empty/draft-title-change. With drafts, a plain
  update without `_status` won't touch the live slug.
- **[CRITICAL]** **`unique: true` slug collisions block publish with a generic "The following field is invalid:
  slug" error.** Publish validates the slug against the WHOLE collection. If another post squats the needed slug,
  publish fails silently-ish. Fix: reassign/free the squatter slug first, then publish the rightful post.
- **[INFO]** **Titles are NOT unique** (only slug is). Slug auto-generation from a title never cross-checks other
  docs, and an explicit slug passed on create bypasses the hook — so slug ≠ title is possible, and cross-doc slug
  collisions can silently build up.
- **[WARNING]** **Payload MCP endpoint (`/api/mcp`):** uses Streamable HTTP, POST-only (GET → 405). opencode remote
  MCP clients that send GET get "SSE error: Non-200 status code (405)". Do NOT set `oauth: false` on this server
  (it broke auth detection); the working opencode config is the Bearer header from `{env:...}` with no `oauth`
  field.
- **[CRITICAL]** **`generateSlug` transliterates German umlauts** (ä→ae, ö→oe, ü→ue, ß→ss) BEFORE stripping other
  diacritics (é/à/ñ still strip). So `Münchener` → `muenchener`, `zurück` → `zurueck`. Changed 2026-08-24; old
  slugs may still use stripped forms (`munchener`) — regenerating from title applies the new rule.
- **[CRITICAL]** **Stale slugs from old titles:** published slugs are frozen by the hook, so a slug can permanently
  mismatch its current title (e.g. 144 `pour-passer-la-melancholie` from a pre-rename title, 98 `les-nations`, 162
  `klavierlecture`). To fix: pass the explicit slug in a Local API update with `_status: published`.
- **[CRITICAL]** **Missing-locale audit:** a post can have one complete locale and none of the other. Check both
  `posts_locales` rows per post (title+slug+content). As of 2026-08-24 prod: 184/213 missing EN, 247 missing DE
  (content-team).

---

## Policies / Never Again (from §10)

1. **Never act on ambiguous intent.** "I would push" is NOT "push it." Only act on explicit, imperative
   instructions for pushes, merges, deploys, or any prod write.
2. **Never run a script against prod without `NODE_ENV=production`.** This single mistake caused the `dev|-1`
   recurrence twice.
3. **Never trust that a migration ran correctly from a deploy log alone.** Verify prod directly via Turso:
   check `payload_migrations`, `PRAGMA foreign_key_list`, and data counts.
4. **Never `turso db import` expecting an overwrite.** It creates a new DB.
5. **Always make migrations idempotent.** Previews re-run them.
6. **Don't guess Payload/drizzle behavior** — check `payload-generated-schema.ts`, the migration `.ts`+`.json`,
   and the live `PRAGMA` output. Dev push ≠ migration output; trust the migration + generated schema.
7. **Take a fresh backup before ANY prod write**, and keep it until verified.
8. **Confirm the database before operating** — `ksschoerke-development` vs `ksschoerke-production` are one
   character different; verify with `turso db shell <name> "SELECT 1"` or the URI host.
9. **Don't assume dev data-loss is acceptable** — dev schema push drops values silently. Verify with the user and
   snapshot before any dev schema change that could matter.
10. **Don't over-engineer migrations** (state machines, complex guards). A simple idempotent `alreadyApplied()` +
    fail-closed count check + snapshot recovery is enough. Prefer the lean guard.
11. **Verify the DB a script will WRITE to, not just read.** With local `dev.db` + remote dev both in play (see
    docs/memory/environments.md), a "successful" Local API update may land on the wrong database. Check
    `DATABASE_URI` output from the actual run (not the shell) and confirm against `sqlite3 dev.db` where local is
    the target.
