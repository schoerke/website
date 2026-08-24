# Environments

Operational environment facts. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §2 (Databases & Environments) + §15 (Vercel Team / Account Management).

---

## Databases & Environments (CRITICAL)

Two Turso databases, both in `eu-west`. **`ksschoerke-development` is the sandbox; `ksschoerke-production` is
live.** There is no local SQLite in normal use.

| Name | Turso db name            | URI host                                                 |
| ---- | ------------------------ | -------------------------------------------------------- |
| Dev  | `ksschoerke-development` | `ksschoerke-development-zeitchef.aws-eu-west-1.turso.io` |
| Prod | `ksschoerke-production`  | `ksschoerke-production-zeitchef.aws-eu-west-1.turso.io`  |

`.env` always holds BOTH pairs; dev is active (uncommented), prod is commented. **Do not swap `.env` to run
operations — use Turso CLI or inline env vars instead** (see docs/memory/migrations.md).

**Since 2026-08-23 there is ALSO a local SQLite dev DB.** `.env.local` overrides `DATABASE_URI` to
`file:./dev.db` for the dev server (`pnpm dev`) and the Payload MCP endpoint. So there are effectively TWO dev
databases:

| Context | Reads | URI |
| ------- | ----- | --- |
| Dev server / admin / MCP | **local** `dev.db` | `.env.local` |
| `tsx` scripts (`dotenv/config`) | **remote** `ksschoerke-development` | `.env` |

**Traps:** MCP/admin show local data; `tsx` scripts show remote data. A `sqlite3 dev.db` read is local. To make a
`tsx` script hit LOCAL, set env inline in the command (`DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local"`)
— a runtime `loadEnv({ path: '.env.local', override: true })` is TOO LATE because ES module imports (incl.
`@/payload.config`) are hoisted and bake `.env` first.

**Reliable prod access without `.env` swap:**

```bash
turso db shell ksschoerke-production "SELECT ..."          # read/write via CLI credentials (approval required per opencode.json)
turso db export ksschoerke-production --output-file data/dumps/NAME.db   # full snapshot backup
```

**Prefer the Payload Local API for reading content data** — see docs/memory/data-operations.md.

## Vercel Team / Account Management (CRITICAL)

**This project's Vercel deployment is managed by a DIFFERENT team than the local CLI account.** The local `vercel`
CLI is authenticated as **zeitchef** (teams: `zeitchef-projects`, `zeitweb`). Do NOT assume either owns this
project.

- ⚠️ `.vercel/project.json` is **STALE**: its `orgId` `team_FEM8tiqNlj16ZQJsumWmUC4R` is an **OLD copy of this
  project that was transferred to the client**. Never use it as the current team id.
- ✅ **Verified current team (2026-08-23):** `team_VW0SXoOVtcPZ7edNwwzmcPnD` — client Eva Wagner's team
  ("eva-wagners-projects"), owner `e.wagner@ks-schoerke.de`. Project `website` →
  `schoerke-website.vercel.app`, plan **hobby**.
- `vercel link` / `vercel whoami` / `vercel teams ls` under the local `zeitchef` CLI auth point at the WRONG
  teams. Always use a token from the client account.
- ⚠️ **Token scope matters:** a **project-scoped** token (`vcp_...`) cannot call team/user endpoints
  (`/v2/teams`, `/v2/user`, usage, observability) — all return 403/"User not found". For usage/operations/observability
  you need a **team-scoped** token. `vercel usage`, `/v2/team/{teamId}/usage`, `/v1/billing/charges` are the API
  surfaces (charges returns "Plan not found" on hobby).
- ✅ **Blob store (verified 2026-08-23):** `store_3jIBiIxvBnjU5oC1` "schoerke-website-storage" —
  **922 blobs, 275 MB**, hobby, region `fra1`, public. Project `prj_KS2v04GAnLLPne2n1ILRFJaQ6iLk`.
- ⚠️ **Hobby has NO programmatic usage/operations API**: `vercel usage` + `/v1/billing/charges` → "Plan not
  found". Blob Simple/Advanced operation counters are **dashboard-only** (team Observability → Blob, or store →
  Usage). API gives store size/count (`GET /v1/storage/stores`) but not operation counts.
