# Reference

Verified tooling commands (turso, payload CLI, sqlite3) and CLI caveats. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §8.

---

## Tooling Reference (verified working)

| Task                      | Command                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Production backup         | Download nightly R2 snapshot (full steps: checklists.md §1); `turso db export` only on explicit user request |
| Inspect prod (read/write) | `turso db shell ksschoerke-production "SQL"`                             |
| Inspect prod read-only (preferred) | checklists.md §1 (nightly R2 backup → local sqlite3)                |
| Inspect an exported `.db` | `sqlite3 data/dumps/NAME.db "SQL"`                                       |
| Delete `dev\|-1` marker   | `echo "DELETE FROM payload_migrations WHERE name='dev';" \| turso db shell ksschoerke-production` |
| Check migration status    | `pnpm payload migrate:status`                                            |
| Create migration file     | `pnpm payload migrate:create <name>`                                     |
| Run pending migrations    | `pnpm payload migrate`                                                   |
| Rollback last batch       | `pnpm payload migrate:down`                                              |
| Regenerate types          | `pnpm payload generate:types`                                            |
| Regenerate importmap      | `pnpm payload generate:importmap`                                        |
| Regenerate DB schema file | `pnpm payload generate:db-schema`                                        |

**Vercel CLI caveat:** the `vercel` CLI is scoped to the `zeitweb` team and does NOT show the real `schoerke`
project's deployments or env vars (`vercel env ls` returns empty; `vercel ls` shows only old failed builds).
**Do not rely on Vercel CLI for deploy status or env inspection** — ask the user or use Turso for DB truth.
