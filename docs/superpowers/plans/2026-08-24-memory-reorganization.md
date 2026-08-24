# MEMORY.md Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 644-line `MEMORY.md` into a lightweight index (repo root) + extracted learnings in `docs/memory/`, and update all live cross-references.

**Architecture:** Pure content migration. Topical files (`environments.md`, `migrations.md`, `scripts.md`, `data-operations.md`, `libraries.md`, `gotchas.md`, `reference.md`, `features/repertoire.md`) + date-keyed `incidents/` files. `MEMORY.md` becomes index + guardrails + legacy § map. Live refs (AGENTS.md, scripts/AGENTS.md, docs/patterns/payload.md, docs/turso-operations.md, scripts/db/backfillVideoLabels.ts) repointed. Historical docs untouched.

**Tech Stack:** Markdown. No code, no tests — verification is via grep + content review.

**Spec:** `docs/superpowers/specs/2026-08-24-memory-reorganization-design.md` (read first).

**Commit policy note:** Per `AGENTS.md`, do NOT commit without explicit user approval. Commit steps below are conditional on user go-ahead. All work happens in the main workspace (docs-only change; no worktree needed).

**Source line ranges below refer to the CURRENT `MEMORY.md` (read it fresh at each task — line numbers are the basis for extraction).**

---

## File map

| File | Source (§/lines in MEMORY.md) | Responsibility |
| ---- | ----------------------------- | -------------- |
| `docs/memory/environments.md` | §2 (20-54), §15 (623-644) | DBs, env traps, Vercel team/account |
| `docs/memory/migrations.md` | §5 (151-188), §6 (192-230), §12 (428-509) | migration workflow, idempotency, FK/ALTER, array renames |
| `docs/memory/scripts.md` | §7 (234-263) | prod-safe script conventions, guards, revalidation |
| `docs/memory/data-operations.md` | §11 (357-424) | Local API vs raw SQL |
| `docs/memory/libraries.md` | §13 (513-566) | search plugin, WordPress migration, Blob |
| `docs/memory/gotchas.md` | §9 (288-328) + §10 (332-353) | severity-tagged facts + never-again policies |
| `docs/memory/reference.md` | §8 (266-284) | tooling command table |
| `docs/memory/features/repertoire.md` | §3 (58-71) | repertoire feature fact sheet |
| `docs/memory/incidents/2026-08-15-prod-half-migrated.md` | §4 (75-148) | incident narrative (5 sub-lessons) |
| `docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md` | §14 → 2026-08-24 entry (598-619) | post-215/247/slug incident |
| `docs/memory/incidents/historical-pre-2026-08.md` | §14 → older entries (572-597) | pre-2026-08 incidents |
| `MEMORY.md` (root) | — | index + guardrails + glance + legacy map |
| `AGENTS.md`, `scripts/AGENTS.md`, `docs/patterns/payload.md`, `docs/turso-operations.md`, `scripts/db/backfillVideoLabels.ts` | — | ref repoint |

---

### Task 1: Create `docs/memory/environments.md`

**Files:**
- Create: `docs/memory/environments.md`

- [ ] **Step 1: Read current MEMORY.md §2 (lines 20-54) and §15 (lines 623-644)**

- [ ] **Step 2: Write `docs/memory/environments.md`**

Copy §2 body verbatim (heading `# Environments`), then §15 verbatim (heading `## Vercel Team / Account Management (CRITICAL)`). Keep all tables, code blocks, and wording.

**Internal ref rewrites (MANDATORY):**
- `see §5` (was line 31) → `see docs/memory/migrations.md`
- `see §11` (was line 54) → `see docs/memory/data-operations.md`

**Header convention** (all topical files):
```markdown
# Environments

Operational environment facts. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` index, §legacy map.

---
```

- [ ] **Step 3: Verify**
- No bare `§\d` refs that point to old sections remain (grep the new file for `§`).
- Tables render (2-space indent preserved from source).

- [ ] **Step 4: Commit (conditional on user approval)**
```bash
git add docs/memory/environments.md
git commit -m "docs: extract MEMORY.md environments section"
```

---

### Task 2: Create `docs/memory/migrations.md`

**Files:**
- Create: `docs/memory/migrations.md`

- [ ] **Step 1: Read current MEMORY.md §5 (151-188), §6 (192-230), §12 (428-509)**

- [ ] **Step 2: Write `docs/memory/migrations.md`**

Copy §5, §6, §12 bodies verbatim under headings `## Deploy & Migration Workflow`, `## Migration Idempotency — MANDATORY`, `## Array Field Renames (Payload + SQLite)`. Use the header convention from Task 1.

**Internal ref rewrites (MANDATORY):**
- §5 `see §6` (line 166) → keep as `see below` / `see "Migration Idempotency"` (same file)
- §5 `see 4.2` (line 167) → `see docs/memory/incidents/2026-08-15-prod-half-migrated.md`
- §6 `this crashed prod` wording → add one pointer: `(see docs/memory/incidents/2026-08-15-prod-half-migrated.md)`
- §12 `See this migration's incident history` → no internal ref; add pointer to §4.4/4.5 facts in `gotchas.md` if mentioned

- [ ] **Step 3: Verify**
- Grep for `§\d` → every hit resolves to a heading in this file or an explicit file path.
- `dev|-1` rule present (from §6).

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/migrations.md
git commit -m "docs: extract MEMORY.md migrations sections"
```

---

### Task 3: Create `docs/memory/scripts.md`

**Files:**
- Create: `docs/memory/scripts.md`

- [ ] **Step 1: Read current MEMORY.md §7 (234-263)**

- [ ] **Step 2: Write `docs/memory/scripts.md`**

Copy §7 body verbatim under `# Scripts — Prod-Safe Conventions`. Header convention per Task 1. Keep the `backfillVideoLabels.ts` and `backfillArtistRepertoire.ts` examples, the inline-env command, and the revalidation note.

**Internal ref rewrites:** none needed (verify).

- [ ] **Step 3: Verify**
- Grep `§\d` → none dangling.
- `NODE_ENV=production` guard text present.

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/scripts.md
git commit -m "docs: extract MEMORY.md scripts conventions"
```

---

### Task 4: Create `docs/memory/data-operations.md`

**Files:**
- Create: `docs/memory/data-operations.md`

- [ ] **Step 1: Read current MEMORY.md §11 (357-424)**

- [ ] **Step 2: Write `docs/memory/data-operations.md`**

Copy §11 body verbatim under `# Payload Local API vs Raw SQL for Prod Data Operations`. Include: the rule, why raw SQL is dangerous (4 bullets), both code patterns (import script, delete via Local API), "when raw SQL IS acceptable", content-data-reads note, and the 2026-04-27 incident.

**Internal ref rewrites:** none (verify with grep).

- [ ] **Step 3: Verify** — grep `§\d` clean; Local API rule text present.

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/data-operations.md
git commit -m "docs: extract MEMORY.md local-api-vs-raw-sql"
```

---

### Task 5: Create `docs/memory/libraries.md`

**Files:**
- Create: `docs/memory/libraries.md`

- [ ] **Step 1: Read current MEMORY.md §13 (513-566)**

- [ ] **Step 2: Write `docs/memory/libraries.md`**

Copy §13 verbatim under `# Library-Specific Knowledge`, preserving subsections 13.1–13.6 headings (retitle without `13.` prefix or keep as `## 13.1 …` for traceability — keep numbers, they map via legacy index). Header convention per Task 1.

**Internal ref rewrites:** `See §13.5` appears in §14 (handled in incident tasks, not here). Verify no `§` refs in §13 body besides the subsection headings.

- [ ] **Step 3: Verify** — grep `§` → only subsection headings; all six subsections present.

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/libraries.md
git commit -m "docs: extract MEMORY.md library-specific knowledge"
```

---

### Task 6: Create `docs/memory/gotchas.md`

**Files:**
- Create: `docs/memory/gotchas.md`

- [ ] **Step 1: Read current MEMORY.md §9 (288-328) and §10 (332-353)**

- [ ] **Step 2: Write `docs/memory/gotchas.md`**

Structure:
```markdown
# Gotchas & Hard-Won Facts

## Facts (severity-tagged)
- **[CRITICAL]** <each §9 bullet verbatim, prepended with severity tag>
  ...
  - Assign CRITICAL to: NODE_ENV/dev|-1, turso db import overwrite, preview-build-migrations, Local-API-versions, two-dev-DB trap, unique slug collisions, generateSlug umlauts, stale slugs, missing-locale audit.
  - Assign WARNING to: tsx no NODE_ENV, pnpm ci reserved, optimistic chips, plain Error→generic toast, hasMany ID arrays, getArtistBySlug order.
  - Keep INFO-level items only if they carry search value (e.g. MCP endpoint details) — otherwise fold into their topical file.

## Policies / Never Again (from §10)
1. ... (each §10 item verbatim, 1-11)
```

**Dedup rule (per spec):** §9 already covers §4.4/§4.5 facts (APIError, optimistic chips). Do NOT duplicate them into the incident file (Task 9). Keep them here tagged.

**Internal ref rewrites (MANDATORY):**
- §9 `see §2` (line 352) → `see docs/memory/environments.md`
- §9 slug/draft bullets referencing post-215 → `(see docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md)`

- [ ] **Step 3: Verify**
- Every §9 bullet has a severity tag (`[CRITICAL]`/`[WARNING]`/`[INFO]`).
- No bare `§\d` dangling.
- All 11 §10 policies present.

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/gotchas.md
git commit -m "docs: extract MEMORY.md gotchas + never-again"
```

---

### Task 7: Create `docs/memory/reference.md`

**Files:**
- Create: `docs/memory/reference.md`

- [ ] **Step 1: Read current MEMORY.md §8 (266-284)**

- [ ] **Step 2: Write `docs/memory/reference.md`**

Copy the tooling table verbatim under `# Tooling Reference (verified working)`, plus the Vercel CLI caveat paragraph.

**Internal ref rewrites:** none.

- [ ] **Step 3: Verify** — table intact (11 rows), Vercel caveat present.

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/reference.md
git commit -m "docs: extract MEMORY.md tooling reference"
```

---

### Task 8: Create `docs/memory/features/repertoire.md`

**Files:**
- Create: `docs/memory/features/repertoire.md`

- [ ] **Step 1: Read current MEMORY.md §3 (58-71)**

- [ ] **Step 2: Write `docs/memory/features/repertoire.md`**

Copy §3 body verbatim under `# Repertoire Feature — What Was Built (2026-08-15)`.

**Internal ref rewrites (MANDATORY):**
- `see §6` (line 70) → `see docs/memory/migrations.md`

- [ ] **Step 3: Verify** — grep `§\d` clean.

- [ ] **Step 4: Commit (conditional)**
```bash
git add docs/memory/features/repertoire.md
git commit -m "docs: extract MEMORY.md repertoire feature"
```

---

### Task 9: Create `docs/memory/incidents/` files (3)

**Files:**
- Create: `docs/memory/incidents/2026-08-15-prod-half-migrated.md`
- Create: `docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md`
- Create: `docs/memory/incidents/historical-pre-2026-08.md`

- [ ] **Step 1: Read current MEMORY.md §4 (75-148) and §14 (570-619)**

- [ ] **Step 2: Write `docs/memory/incidents/2026-08-15-prod-half-migrated.md`**

Copy §4 verbatim: intro + 4.1 (what happened, root causes, safeguards), 4.2 (restore chaos + verified method + lesson), 4.3 (dev|-1 marker + rules). Structure: `# Incident 2026-08-15: Prod Half-Migrated`.

**Internal ref rewrites (MANDATORY):**
- `see §6` (lines 90, 94) → `see docs/memory/migrations.md`
- `see §7` (line 94) → `see docs/memory/scripts.md`
- `see §5` mentions → `see docs/memory/migrations.md`
- The `docs/turso-operations.md §3c` reference (line 111) stays as-is (that file still exists).

- [ ] **Step 3: Write `docs/memory/incidents/2026-08-24-posts-desync-slug-incident.md`**

Copy the §14 2026-08-24 entry (lines 598-619) verbatim: symptom, root cause (version/live desync + slug collision), fix (local + prod), post-247 root cause, guards pointer.

**Internal ref rewrites (MANDATORY):**
- `See §13.5` (line 590 — this is in the §14 2026-08-24 block? verify) → `see docs/memory/libraries.md`
- `see §9` (line 619) → `see docs/memory/gotchas.md`
- Heading: `# Incident 2026-08-24: Post 215 Desync + Slug Collisions`

- [ ] **Step 4: Write `docs/memory/incidents/historical-pre-2026-08.md`**

Copy remaining §14 entries verbatim: 2025-11-30 token generation, 2025-11-30 FK errors, 2025-11-24 remote DB modify, 2025-11-30 Blob bandwidth (`See §13.5` → `see docs/memory/libraries.md`), 2025-12 artist projects ordering (keep `docs/plans/...` path ref as-is).

- [ ] **Step 5: Verify all three incident files**
- Grep `§\d` → every hit resolves to a new file path or a real section heading.
- 2026-08-15 file has 4.1-4.3 (4.4/4.5 facts NOT duplicated — pointer to gotchas.md only).
- Historical file has all 5 older entries.

- [ ] **Step 6: Commit (conditional)**
```bash
git add docs/memory/incidents/
git commit -m "docs: extract MEMORY.md incidents"
```

---

### Task 10: Rewrite `MEMORY.md` as index

**Files:**
- Modify: `MEMORY.md` (full replace)

- [ ] **Step 1: Read spec section "MEMORY.md (index) structure"**

- [ ] **Step 2: Replace entire `MEMORY.md` content with:**

```markdown
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
```

- [ ] **Step 3: Verify**
- No section bodies (only index rows, guardrails, glance, legacy map).
- Every new `docs/memory/` file appears in the index table.
- Grep repo root `MEMORY.md` for `§` → only in legacy map + guardrail pointers.

- [ ] **Step 4: Commit (conditional)**
```bash
git add MEMORY.md
git commit -m "docs: convert MEMORY.md to searchable index"
```

---

### Task 11: Update live cross-references

**Files:**
- Modify: `AGENTS.md`
- Modify: `scripts/AGENTS.md`
- Modify: `docs/patterns/payload.md`
- Modify: `docs/turso-operations.md`
- Modify: `scripts/db/backfillVideoLabels.ts`

- [ ] **Step 1: `AGENTS.md`** (read first)
- Line ~107: `Full explanation, code patterns, and the 2026-04-27 posts incident: MEMORY.md §11` → `…incident: docs/memory/data-operations.md`
- Line ~120: `video-loss incident: MEMORY.md §12` → `…incident: docs/memory/migrations.md`
- Lines ~124-128: `MEMORY.md §13.1` … `§13.5` → `docs/memory/libraries.md` (each)
- Line ~132: `Full incident log: MEMORY.md §14` → `…incident log: docs/memory/incidents/`
- Lines ~68, 97: "READ `MEMORY.md` FIRST" / "MEMORY.md is the authoritative record of operational lessons…" → "READ `MEMORY.md` (the index) FIRST — full learnings in `docs/memory/`."

- [ ] **Step 2: `scripts/AGENTS.md`**
- Line ~43: `See MEMORY.md §4-§7 for the full restore procedure and the dev|-1 incident` → `See docs/memory/incidents/2026-08-15-prod-half-migrated.md (restore), docs/memory/migrations.md (dev|-1 rule), docs/memory/scripts.md (conventions)`

- [ ] **Step 3: `docs/patterns/payload.md`**
- Line ~3: `Complements MEMORY.md (incidents/procedures)` → `Complements docs/memory/ (incidents/procedures)`
- Line ~112: `Full detail: MEMORY.md §11` → `Full detail: docs/memory/data-operations.md`

- [ ] **Step 4: `docs/turso-operations.md`**
- Line ~160: `See MEMORY.md §4.3` → `See docs/memory/migrations.md`
- Line ~166: `See MEMORY.md §4.2 for the full incident narrative` → `See docs/memory/incidents/2026-08-15-prod-half-migrated.md`

- [ ] **Step 5: `scripts/db/backfillVideoLabels.ts`**
- Line ~11 JSDoc: `(see MEMORY.md §12 / this migration's incident history)` → `(see docs/memory/migrations.md)`
- Line ~64 guard comment: `(MEMORY.md §4.3)` → `(see docs/memory/migrations.md)`

- [ ] **Step 6: Verify**
- Grep live paths for `MEMORY\.md §` → zero hits.
- Grep for bare `§\d` in live paths → zero hits.
- Confirm `docs/adr/`, `docs/plans/`, `docs/superpowers/` still contain `§\d` (intentional).

- [ ] **Step 7: Commit (conditional)**
```bash
git add AGENTS.md scripts/AGENTS.md docs/patterns/payload.md docs/turso-operations.md scripts/db/backfillVideoLabels.ts
git commit -m "docs: repoint live MEMORY.md refs to docs/memory/"
```

---

### Task 12: Full verification pass

**Files:** none (read-only)

- [ ] **Step 1: Run the spec's verification checklist**
```bash
# 1. No dangling live refs:
rg "MEMORY\.md §|MEMORY §" AGENTS.md scripts/ docs/patterns/ docs/turso-operations.md
# expect: zero hits

# 2. Internal refs resolve:
rg "§" docs/memory/ -n
# expect: every hit is a subsection heading or an explicit file-path ref

# 3. No section bodies in index:
rg "^## [0-9]" MEMORY.md
# expect: only 0/1/2/3/4 index sections

# 4. Historical docs still carry legacy refs (intentional):
rg "§" docs/adr/ docs/plans/ docs/superpowers/ -n
# expect: matches, each cross-checked against legacy map
```

- [ ] **Step 2: Content spot-check**
- Open each `docs/memory/*.md`: title correct, header convention present, tables render.
- Confirm 4.4/4.5 facts live ONLY in `gotchas.md` (not duplicated in incident file).
- Confirm `docs/memory/incidents/2026-08-15-prod-half-migrated.md` still references `docs/turso-operations.md §3c` correctly.

- [ ] **Step 3: Report results to user.** Do NOT commit in this task — user approves final commit.

---

## Self-review

- **Spec coverage:** Guardrails → Task 10 ✓; glance → Task 10 ✓; index table → Task 10 ✓; incidents table → Task 10 ✓; legacy map → Task 10 ✓; all 8 topical files → Tasks 1-8 ✓; 3 incident files → Task 9 ✓; live cross-refs (AGENTS.md, scripts/AGENTS.md, payload.md, turso-operations.md, backfillVideoLabels.ts) → Task 11 ✓; internal §-ref rewrite → baked into each create task ✓; dedup rule (4.4/4.5 → gotchas.md only) → Tasks 6, 9 ✓; verification → Task 12 ✓; atomic commit strategy → Task 10 replaces MEMORY.md only after all files exist (Tasks 1-9 before Task 10) ✓; no opencode.json change ✓.
- **Placeholder scan:** No TBD/TODO. Every task has concrete source ranges + ref rewrites + verification + commit.
- **Type consistency:** File paths identical across tasks and index table; incident filenames consistent with spec; legacy map subsection keys match reviewer finding W4.
