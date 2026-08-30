# Environments

Operational environment facts. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §2 (Databases & Environments) + §15 (Vercel Team / Account Management).

---

## Databases & Environments (CRITICAL)

**`ksschoerke-development` does not exist — never target it.** The only databases are the **local SQLite
`dev.db`** (canonical dev) and **`ksschoerke-production`** (live). Any doc/script referencing
`ksschoerke-development` is stale.

| Name | URI |
| ---- | --- |
| Dev (canonical) | **local** `file:./dev.db` |
| Prod | `libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io` |

`.env.local` overrides `DATABASE_URI` to `file:./dev.db` for the dev server (`pnpm dev`) and the Payload MCP
endpoint. `tsx` scripts (`dotenv/config`) read `.env` (prod pair).

**Traps:** MCP/admin show local data; `tsx` scripts show remote data. A `sqlite3 dev.db` read is local. To make a
`tsx` script hit LOCAL, set env inline in the command (`DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local"`)
— a runtime `loadEnv({ path: '.env.local', override: true })` is TOO LATE because ES module imports (incl.
`@/payload.config`) are hoisted and bake `.env` first.

**Reliable prod access without `.env` swap:**

```bash
turso db shell ksschoerke-production "SELECT ..."          # read/write via CLI credentials (approval required per opencode.json)
```

**Prefer the Payload Local API for reading content data** — see docs/memory/data-operations.md. For read-only
inspection/audits and production backups, use checklists.md §1 (nightly R2 backup → local sqlite3). Do not run
`turso db export` unless the user explicitly requests it.

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
