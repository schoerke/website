# Scripts

Prod-safe conventions for database/backfill scripts. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §7.

---

## Scripts — Prod-Safe Conventions

### Backfill / data scripts

- `scripts/db/backfillArtistRepertoire.ts` has a **guard**: it aborts if `DATABASE_URI` contains
  `ksschoerke-production` and `NODE_ENV !== 'production'`. Keep this guard pattern in all prod-targeting scripts.
- **Run against prod WITHOUT touching `.env`:**
  ```bash
  NODE_ENV=production DATABASE_URI=libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io \
  DATABASE_AUTH_TOKEN=<prod token from .env commented line> \
  pnpm tsx scripts/db/backfillArtistRepertoire.ts --apply
  ```
  `NODE_ENV=production` is what prevents `pushDevSchema` (and thus the `dev|-1` marker) on connect.
- Inline env vars override `.env` (verified: `@next/env` only fills unset vars).

### Scripts depending on gitignored local data files

If a backfill script's only data source is a gitignored file (e.g. `data/dumps/*.tsv` — deliberately NOT
committed to avoid checking in content data), **guard on file existence and fail with exact regeneration
steps**, not a bare `ENOENT`. State both cases: (1) source DB hasn't migrated yet → regenerate from a fresh
export, with the exact command; (2) source DB already migrated (column dropped) → the live data is gone,
must restore from a pre-migration snapshot instead. See `scripts/db/backfillVideoLabels.ts` for the pattern.

### Revalidation hooks vs scripts

Artist `afterChange` runs `revalidateArtistOnChange`, which calls `revalidatePath` — **this throws outside a
Next.js server context**. Scripts that `payload.update` artists must pass
`context: { syncingRepertoire: true, skipRevalidation: true }` (the revalidate hook checks
`req.context?.skipRevalidation`).
