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

**This project's Vercel deployment lives on the client team `eva-wagners-projects`.** Local `vercel` CLI
authenticates as **zeitchef**, who is a **Member** of that team (since 2026-08-25) and can use his own CLI
auth/token — no client token needed.

- ⚠️ `.vercel/project.json` was **STALE** (old `orgId` `team_FEM8tiqNlj16ZQJsumWmUC4R`, an old copy of this
  project transferred to the client). **Re-linked 2026-08-25** to the real project.
- ✅ **Verified current team (2026-08-23, re-verified 2026-08-25):** `team_VW0SXoOVtcPZ7edNwwzmcPnD` — client
  Eva Wagner's team ("eva-wagners-projects" / Künstlersekretariat Schoerke), owner `e.wagner@ks-schoerke.de`
  (Eva is the maintainer's wife — Owner-only tasks like billing/SSO/member mgmt go through her account).
  Project `website` → `schoerke-website.vercel.app`, plan **Pro** (upgraded from hobby).
- `vercel teams ls` as zeitchef shows: `zeitchef-projects` (own), `eva-wagners-projects`, `zeitweb`.
- **Member role limits:** no billing, no inviting/removing members, no team deletion, no team-level SSO/security.
  Full project control otherwise (prod deploy, all env vars incl prod, settings, domains).
- **Own projects unaffected:** per-repo `.vercel` links keep scopes separate; use `--scope` per command or
  `vercel teams switch`.
- ⚠️ **Token scope matters:** a **project-scoped** token (`vcp_...`) cannot call team/user endpoints
  (`/v2/teams`, `/v2/user`, usage, observability) — all return 403/"User not found". For usage/operations/observability
  you need a **team-scoped** token. `vercel usage`, `/v2/team/{teamId}/usage`, `/v1/billing/charges` are the API
  surfaces. With Member role on a Pro team, CLI auth covers these directly.
- ✅ **Blob store (verified 2026-08-23):** `store_3jIBiIxvBnjU5oC1` "schoerke-website-storage" —
  **922 blobs, 275 MB**, region `fra1`, public. Project `prj_KS2v04GAnLLPne2n1ILRFJaQ6iLk` (= current linked
  projectId since 2026-08-25 re-link).
