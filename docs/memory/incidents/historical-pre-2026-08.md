# Incidents: pre-2026-08 (Historical)

Operational incident write-ups. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §14.

---

## 2025-11-30: Unauthorized Database Token Generation

Agent ran `turso db tokens create` without permission after accidentally removing `DATABASE_AUTH_TOKEN` from
`.env` during R2 cleanup. Resolution: user supplied the original token. **NEVER generate credentials without
explicit permission; ask the user for missing values.**

## 2025-11-30: Foreign Key Errors During Employee Migration

Migration failed with "FOREIGN KEY constraint failed" because `media-id-map.json` held Payload image IDs that
didn't exist. **Always verify foreign key references exist before running migrations that create relationships.**

## 2025-11-24: Remote Database Modified Without Verification

Made DB changes on a remote Turso DB without verifying `.env` config. **Always verify the database environment
before operating.**

## 2025-11-30: Vercel Blob Bandwidth

Vercel Blob free tier: 10 GB/month bandwidth; large ZIPs (40-60 MB) exhaust it fast. Full detail: docs/memory/libraries.md.

## 2025-12: Artist Projects Ordering

Per-artist ordering via a relationship field + auto-sync `afterChange` hook on Posts. This was the reference
pattern for the Repertoire ordering feature. Full design:
`docs/plans/2025-12-13-artist-projects-ordering-design.md`.

