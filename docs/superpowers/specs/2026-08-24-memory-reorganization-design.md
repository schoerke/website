# MEMORY.md Reorganization Design

Date: 2026-08-24

## Purpose

Restructure `MEMORY.md` (currently 644 lines, 15 sections) into a lightweight, searchable
**index** at the repo root, with the full learnings extracted into a new `docs/memory/`
directory. Agents should be able to grep the index, identify the right file, and jump there
— without carrying a 644-line doc in context.

## Decisions (from brainstorming)

1. **Hybrid organization:** topical files for workflows/facts + a separate date-keyed
   `incidents/` directory for narrative-heavy incident write-ups.
2. **MEMORY.md = index + guardrails:** a short "Non-Negotiable Guardrails" block at the top
   (one-liners, each pointing to its file), the existing "Project At a Glance" (4 bullets), a
   keyword-bearing topic index, an incident table, and a legacy `§` → file mapping.
3. **Gotchas = critical learnings:** a dedicated `gotchas.md` with per-entry severity tags
   (`CRITICAL` / `WARNING` / `INFO`). The most-critical one-liners also appear in the MEMORY.md
   guardrails block (small, justified redundancy for safety).
4. **Cross-references:** update live/operational refs to the new paths (AGENTS.md,
   `scripts/AGENTS.md`, `docs/patterns/payload.md`, `docs/turso-operations.md`). Leave
   historical docs (`docs/adr/`, `docs/plans/`, `docs/superpowers/specs/`, `docs/superpowers/plans/`)
   untouched — they are frozen snapshots. A legacy `§` → file map in the index keeps old refs
   traceable.
5. **`docs/patterns/payload.md` stays separate** (already auto-loaded via opencode.json) — its
   `MEMORY.md §N` refs are updated, but no content merge. It remains the "payload-specific coding
   patterns" home; `docs/memory/migrations.md` covers "how our DB/migrations actually run."
6. **MEMORY.md keeps its name/location** (repo root) because AGENTS.md and `scripts/AGENTS.md`
   reference it by name.

## Target structure

```
docs/memory/
  environments.md          # §2 DBs/env traps, §15 Vercel team/account
  migrations.md            # §5 workflow, §6 idempotency/FK-ALTER trap, §12 array renames
  scripts.md               # §7 prod-safe conventions, guards, revalidation hooks
  data-operations.md       # §11 Local API vs raw SQL, import/delete patterns
  libraries.md             # §13 search plugin, WordPress migration, Blob limits
  gotchas.md               # §9 hard-won facts (severity-tagged) + §10 "never again" policies
  reference.md             # §8 tooling command table
  features/repertoire.md   # §3 what-was-built feature fact sheet
  incidents/
    2026-08-15-prod-half-migrated.md   # §4 (5 sub-lessons)
    2026-08-24-posts-desync-slug-incident.md  # §14's 2026-08-24 incident
    historical-pre-2026-08.md          # §14's older incidents (2025-11-24, 2025-11-30 x3, 2025-12)
```

## MEMORY.md (index) structure

```markdown
# MEMORY.md — Project Operational Memory (INDEX)

> Read this index + the guardrails below before any DB/migration/deploy work.
> Full learnings: docs/memory/. One authoritative source per topic.

## 0. Non-Negotiable Guardrails (one-liners; depth in linked files)
- Never run prod scripts w/o NODE_ENV=production → scripts.md
- Two dev DBs (local dev.db vs remote ksschoerke-development); verify target → environments.md
- Never raw SQL/@libsql to copy/write prod; use Payload Local API → data-operations.md
- Migrations MUST be idempotent (previews re-run them) → migrations.md
- Never turso db import expecting overwrite → gotchas.md
- Verify the DB a script WRITES to, not just reads → gotchas.md
- Never generate credentials without explicit permission → AGENTS.md

## 1. Project At a Glance   (kept here, unchanged 5 lines)

## 2. Index — by topic
| File | Covers | Key terms |
| environments.md | ... | turso, dev.db, DATABASE_URI, ... |
| migrations.md   | ... | payload migrate, dev|-1, ... |
| scripts.md      | ... | NODE_ENV, guard, skipRevalidation, ... |
| data-operations.md | ... | Local API, raw SQL, import, ... |
| libraries.md    | ... | plugin-search, WordPress, Blob, ... |
| gotchas.md      | ... | drafts, slug collision, unique, ... |
| reference.md    | ... | turso db export, migrate:create, ... |
| features/repertoire.md | ... | repertoire, syncArtistRepertoire, ... |

## 3. Incidents
| Date | File | One-line summary |

## 4. Legacy § map (old MEMORY.md section → new file)
```

Index rows carry **search keywords** so grep hits land on MEMORY.md and point to the right
file — the mechanism that makes it "searchable quickly by agents."

## Content mapping detail

| Old § | Topic | New home |
| ----- | ----- | -------- |
| §1 | Project At a Glance | MEMORY.md header (keep; NOT moved) |
| §2 | Databases & Environments | environments.md |
| §3 | Repertoire feature | features/repertoire.md |
| §4 | 2026-08-15 incident | incidents/2026-08-15-prod-half-migrated.md |
| §5 | Deploy & migration workflow | migrations.md |
| §6 | Migration idempotency / FK-ALTER trap | migrations.md |
| §7 | Scripts prod-safe conventions | scripts.md |
| §8 | Tooling reference | reference.md |
| §9 | Gotchas & hard-won facts | gotchas.md (severity-tagged) |
| §10 | Recurring themes / never again | gotchas.md → "Policies / Never Again" |
| §11 | Local API vs raw SQL | data-operations.md |
| §12 | Array field renames | migrations.md |
| §13 | Library-specific knowledge | libraries.md (13.1–13.6) |
| §14 | Historical incident log | incidents/ (2 files + historical) |
| §15 | Vercel team / account | environments.md |

## Dedup rule (mandatory — §4.4, §4.5, §9, payload.md overlap)

- §4.4 (`APIError`) and §4.5 (optimistic chips) already exist in §9 (lines 299-300) and in
  `docs/patterns/payload.md` ("Errors: use APIError" / "Admin relationship chips remove
  optimistically").
- Rule: **incident file keeps the narrative only**; the standalone fact lives in `gotchas.md`;
  `docs/patterns/payload.md` keeps its copy but gets a cross-ref pointer to `gotchas.md`.
  Do NOT copy §4.4/§4.5 into the incident file as standalone facts — reference gotchas.md.
- Similarly §10.2/§10.4/§10.5 overlap §9/§4.3/§6 (NODE_ENV, import-overwrite, idempotency).
  In gotchas.md, facts list + "Policies / Never Again" list may double-cover: keep the fact
  once in the facts list, and let the policy list state the rule in one line + cross-link.
  "One authoritative source per topic" must actually hold after the split.

## Internal §-ref rewrite (mandatory inside moved content)

Copying text verbatim leaves dangling `§N` refs inside moved files. Each new file's content
MUST have its internal section refs rewritten to the new homes. Known refs to fix (verify with
grep after moving):

- §2:31 "see §5" → `migrations.md`; §2:54 "see §11" → `data-operations.md`
- §3:70 "see §6"; §4.1:90/94 "see §6/§7" → `migrations.md`/`scripts.md`
- §5:166 "see §6" → `migrations.md` (self); §5:167 "see 4.2" → `incidents/2026-08-15-...`
- §9:352 "see §2" → `environments.md`; §14:590 "See §13.5" → `libraries.md`; §14:619 "see §9"
  → `gotchas.md`

## Execution order + commit strategy

1. Create `docs/memory/` files (all of them) with the extracted content + rewritten internal
   refs.
2. Rewrite `MEMORY.md` as the index (guardrails + glance + topic index + incident table +
   legacy § map).
3. Update live cross-refs (AGENTS.md, scripts/AGENTS.md, docs/patterns/payload.md,
   docs/turso-operations.md, scripts/db/backfillVideoLabels.ts).
4. Verification grep (below).

Commit strategy: **one atomic commit** covering all four steps (or an add-files commit first,
then a second commit that flips the index + refs). Avoids any window where refs dangle.

## Verification (mandatory before declaring done)

- Grep `AGENTS.md`, `scripts/AGENTS.md`, `scripts/db/*.ts`, `docs/patterns/`,
  `docs/turso-operations.md` for `MEMORY\.md §` and bare `§\d` — confirm only intended refs
  remain.
- Grep every new `docs/memory/*.md` file for bare `§\d` — confirm each resolves to a real
  home file.
- Confirm `MEMORY.md` no longer contains section bodies (only index rows + guardrails + glance).
- `docs/adr/`, `docs/plans/`, `docs/superpowers/` grep `§\d` — expected to still match (legacy
  refs, intentionally untouched); cross-check each matches a legacy-map row.

## Legacy § map granularity

The legacy map in MEMORY.md must list **subsection rows** actually referenced externally, keyed
`§N` (no `.md` prefix), covering both ref styles (`MEMORY.md §4.2` and `MEMORY §4.3`):

- §4.1, §4.2, §4.3, §4.4, §4.5 → `incidents/2026-08-15-prod-half-migrated.md`
- §5, §6 → `migrations.md`; §7 → `scripts.md`
- §12 → `migrations.md`; §13.1–§13.6 → `libraries.md`
- §1 → MEMORY.md; §2 → `environments.md`; §3 → `features/repertoire.md`; §8 → `reference.md`;
  §9, §10 → `gotchas.md`; §11 → `data-operations.md`; §14 → `incidents/`; §15 → `environments.md`

## Cross-reference updates (live refs only)

- **AGENTS.md:** `MEMORY.md §11` → `docs/memory/data-operations.md`; `§12` →
  `docs/memory/migrations.md`; `§13.1–13.5` → `docs/memory/libraries.md`; `§14` →
  `docs/memory/incidents/`. Keep the "READ MEMORY.md FIRST" wording (now "read the index").
  Also rewrite the "MEMORY.md is the authoritative record..." line → "MEMORY.md is the index;
  the authoritative record lives in `docs/memory/`."
- **scripts/AGENTS.md:** `MEMORY.md §4-§7` → `docs/memory/incidents/2026-08-15-...` +
  `docs/memory/migrations.md` + `docs/memory/scripts.md`.
- **docs/patterns/payload.md:** header line 3-4 "Complements `MEMORY.md` (incidents/procedures)"
  → "Complements `docs/memory/` (incidents/procedures)"; `MEMORY.md §11` →
  `docs/memory/data-operations.md`.
- **docs/turso-operations.md:** `MEMORY.md §4.3` → `docs/memory/migrations.md` (the `dev|-1`
  rule); `§4.2` → `docs/memory/incidents/2026-08-15-prod-half-migrated.md`.
- **scripts/db/backfillVideoLabels.ts:** JSDoc line 11 `(see MEMORY.md §12 / this migration's
  incident history)` → `(see docs/memory/migrations.md)`; guard comment line 64 `(MEMORY.md
  §4.3)` → `(see docs/memory/migrations.md)`. Match this script's `@see` cross-ref convention
  everywhere.
- **NOT touched:** `docs/adr/`, `docs/plans/`, `docs/superpowers/specs/`, `docs/superpowers/plans/`
  (historical snapshots).
- **opencode.json:** NO change. It auto-loads only `docs/patterns/*`; MEMORY.md and
  `docs/memory/*` are intentionally NOT auto-loaded — they are grep-accessed via the AGENTS.md
  instruction ("read the index"). State this in MEMORY.md so agents aren't surprised.

## Out of scope

- No new lessons or policy changes — reorganization + reference rewrites only. (Internal `§N`
  ref rewrites inside moved content are part of the reorg, see above.)
- No changes to `docs/patterns/payload.md` beyond reference-path updates.
- No changes to AGENTS.md policy text beyond reference-path updates.
- No `opencode.json` changes (grep-based access to docs/memory/ is by design).
