# Scripts Conventions

Rules for anything in `scripts/` (or `tmp/` for scratch). This file loads when working in this directory.

## Non-Negotiable

- **`import 'dotenv/config'` FIRST** in every script that touches Payload/DB. Without it: "missing secret key".
  ```typescript
  import 'dotenv/config'
  import config from '@/payload.config'
  import { getPayload } from 'payload'
  ```
- **Prod-targeting scripts MUST run with `NODE_ENV=production`** (prevents `pushDevSchema`, which re-adds the
  `dev|-1` migration marker). Add a guard like in `scripts/db/backfillArtistRepertoire.ts`:
  ```typescript
  const isProd = (process.env.DATABASE_URI || '').includes('ksschoerke-production')
  if (isProd && process.env.NODE_ENV !== 'production') {
    console.error('❌ ABORT: production requires NODE_ENV=production'); process.exit(1)
  }
  ```
- **Destructive scripts default to dry-run** with an explicit `--apply` flag.
- **Never commit `tmp/` scripts** (gitignored except `tmp/README.md`). Promote to `scripts/` with JSDoc when they
  become permanent.

## Permanent scripts (`scripts/`)

- Comprehensive JSDoc: purpose, usage examples, env requirements, `@see` cross-refs.
- Naming: `verbNoun.ts` (e.g., `dumpCollection.ts`).
- Revalidation hooks throw outside Next.js server context — pass
  `context: { ... , skipRevalidation: true }` on `payload.update` in scripts.

## Reading the DB

- Read-only prod checks: `turso db shell ksschoerke-production "SQL"` (no `.env` swap).
- Full backups: `turso db export ksschoerke-production --output-file data/dumps/NAME.db`.
- `turso db import` creates a NEW database — it cannot overwrite an existing one.

See `MEMORY.md` §4-§7 for the full restore procedure and the `dev|-1` incident.
