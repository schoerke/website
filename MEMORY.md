# MEMORY.md — Project Operational Memory (INDEX)

> Read this index + the guardrails below before any DB/migration/deploy work.
> Full learnings: `docs/memory/`. One authoritative source per topic.
> `docs/memory/` is NOT auto-loaded — grep this index (or the files directly) to find content.

## 0. Non-Negotiable Guardrails (one-liners; depth in linked files)

- Never run prod scripts w/o `NODE_ENV=production` → `docs/memory/scripts.md`
- Two dev DBs (local `dev.db` vs remote `ksschoerke-development`); verify the target → `docs/memory/environments.md`
- Never raw SQL/`@libsql/client` to copy/write prod; use the Payload Local API → `docs/memory/data-operations.md`
- Migrations MUST be idempotent (previews re-run them) → `docs/memory/migrations.md`
- Never `turso db import` expecting an overwrite → `docs/memory/gotchas.md`
- Verify the DB a script WRITES to, not just reads → `docs/memory/gotchas.md`
- Never generate credentials without explicit permission → `AGENTS.md`

## 1. Project At a Glance

- **Stack:** Next.js 16 (App Router), Payload CMS 3.88, SQLite via Turso (libSQL), drizzle-kit (transitive), Tailwind, next-intl (de/en), Vitest.
- **Deployed to:** Vercel. Git remote: `https://github.com/schoerke/website.git`.
- **Core entities:** Artists, Repertoire, Recordings, Posts, Employees, Pages, Images, Documents, Users, NewsletterContacts. Globals: HomePage.
- **Search:** `@payloadcms/plugin-search` (localized), reindexed at build via `generate:search-index`.

## 2. Index — by topic

| File | Covers | Key terms |
| ---- | ------ | --------- |
| `docs/memory/environments.md` | DBs (dev/prod/local), env traps, Vercel team/account | turso, dev.db, DATABASE_URI, MCP, ksschoerke, zeitchef, blob |
| `docs/memory/migrations.md` | workflow, idempotency, FK/ALTER trap, array renames | payload migrate, dev\|-1, alreadyApplied, pushDevSchema |
| `docs/memory/scripts.md` | prod-safe conventions, guards, revalidation | NODE_ENV, guard, skipRevalidation, backfill |
| `docs/memory/data-operations.md` | Local API vs raw SQL | Local API, raw SQL, import, versions, hooks |
| `docs/memory/db-operations.md` | verified Turso backup/dump/restore/clone/schema-parity | turso db export, .dump, restore, clone prod→dev, schema parity |
| `docs/memory/libraries.md` | search plugin, WordPress, Blob | plugin-search, localize, WordPress, R2, Vercel Blob |
| `docs/memory/gotchas.md` | severity-tagged facts + never-again policies | drafts, slug, unique, umlauts, optimistic |
| `docs/memory/reference.md` | tooling commands | turso db export, migrate:create, generate:types |
| `docs/memory/features/repertoire.md` | repertoire feature | repertoire, syncArtistRepertoire, order-only |
| `docs/memory/incidents/2026-08-15-prod-half-migrated.md` | prod half-migrated, restore | CASCADE, dev\|-1, restore, snapshot |
| `docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md` | post 215/247, slug collisions | Poltéra, slug, versions, desync |
| `docs/memory/incidents/historical-pre-2026-08.md` | pre-2026-08 incidents | token, FK, R2, ordering |

## 3. Incidents

| Date | File | Summary |
| ---- | ---- | ------- |
| 2026-08-15 | `docs/memory/incidents/2026-08-15-prod-half-migrated.md` | Prod DB half-migrated via preview build; CASCADE FK lost; restore chaos |
| 2026-08-24 | `docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md` | Post 215 invisible: live/version desync + slug collision; 247 locale-commit failure |
| pre-2026-08 | `docs/memory/incidents/historical-pre-2026-08.md` | Token gen, FK errors, remote DB modify, Blob bandwidth, projects ordering |

## 4. Legacy § map (old MEMORY.md section → new file)

| Old § | New home |
| ----- | -------- |
| §1 | `MEMORY.md` header (kept) |
| §2 | `docs/memory/environments.md` |
| §3 | `docs/memory/features/repertoire.md` |
| §4.1, §4.2, §4.3 | `docs/memory/incidents/2026-08-15-prod-half-migrated.md` |
| §4.4, §4.5 | `docs/memory/gotchas.md` |
| §5, §6, §12 | `docs/memory/migrations.md` |
| §7 | `docs/memory/scripts.md` |
| §8 | `docs/memory/reference.md` |
| §9, §10 | `docs/memory/gotchas.md` |
| §11 | `docs/memory/data-operations.md` |
| §13.1–§13.6 | `docs/memory/libraries.md` |
| §14 | `docs/memory/incidents/` (3 files) |
| §15 | `docs/memory/environments.md` |
