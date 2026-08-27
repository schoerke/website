# Operational Checklists — Quick Access

Authoritative **commands + expected output + failure branch** for very common tasks. Deep-dive, rationale,
internals, and incidents live in `docs/memory/*.md` — **no commands there for the tasks below**. If a section in
`docs/memory/*.md` still shows these commands, that file is STALE (was not stripped when this file was created
2026-08-27).

**Convention:** this file = what to run. `docs/memory/*.md` = why + edge cases. Keep them that way.

---

## 1. Inspect prod read-only (nightly R2 backup → local sqlite3)

Zero prod reads, no turso approval. Uses the previous night's snapshot — good enough for audits, counts, schema
checks. True-latest (> last night): `turso db shell` or the Local API instead.

**Preconditions:** R2 creds exported in your shell (GitHub Actions secrets, NOT `.env`): `BACKUP_R2_ACCESS_KEY` /
`BACKUP_R2_SECRET` / `BACKUP_R2_ENDPOINT` — or plain `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. Sourced each
shell session. **Never put credentials inline in this file or on the command line.**

```bash
# 1. list nightly backups, pick newest by name (lexicographic sort = timestamp order)
LATEST=$(aws s3 ls s3://schoerke-website-backup/backups/ \
  --endpoint-url "$BACKUP_R2_ENDPOINT" | sort | tail -1 | awk '{print $NF}')
echo "latest: $LATEST"

# 2. download latest + decompress to /tmp (NEVER over dev.db — see §3 for refresh)
aws s3 cp "s3://schoerke-website-backup/backups/$LATEST" \
  --endpoint-url "$BACKUP_R2_ENDPOINT" /tmp/prod.db.gz
gunzip -c /tmp/prod.db.gz > /tmp/prod.db && rm /tmp/prod.db.gz

# 3. verify integrity, then query locally (read-only)
sqlite3 /tmp/prod.db "PRAGMA integrity_check;"                          # expect: ok
sqlite3 /tmp/prod.db "SELECT COUNT(*) FROM posts;"                       # spot-check
sqlite3 /tmp/prod.db "SELECT name, batch FROM payload_migrations;"       # schema currency
```

**Failure branches:** integrity ≠ `ok` → re-download (file corrupted). Backup may lag last checkpoint
(the R2 `.db.gz` is a single file; a `turso db export` snapshot can have a `.db-wal` sibling — for R2 nightly
snapshots that is already checkpointed). Too-fresh object may be mid-write by the nightly job — prefer the
previous night for stable reads.

---

## 2. Full prod backup before any write

**The ONLY safe pre-write backup.** Take before ANY prod mutation; keep until the mutation is verified.

**Preconditions:** expects turso approval prompt (per `opencode.json` every `turso` command is approval-gated).

```bash
mkdir -p data/dumps
turso db export ksschoerke-production --output-file data/dumps/ksschoerke-production-$(date +%Y%m%d-%H%M%S).db
```

Produces a complete SQLite snapshot (`.db`) + optional `.db-wal` sibling — keep both. Inspect locally:
`sqlite3 data/dumps/NAME.db "SELECT COUNT(*) FROM artists"`.

**Failure branches:** export fails/partial → do NOT write to prod until a verified good snapshot exists.
**Ordering rule:** read-only inspection → §1 (zero prod reads, no approval). Pre-write snapshot → §2
(`turso db export`).

---

## 3. Refresh local `dev.db` from nightly R2 backup (VERIFIED 2026-08-26)

Seed/refresh the LOCAL SQLite file (`file:./dev.db`, canonical dev) from the nightly prod backup. **The ONLY
sanctioned way to refresh local dev.** MCP key is **preserved** (verified 2026-08-26) — no re-key needed.
Source lineage: plan `docs/superpowers/plans/2026-08-23-local-sqlite-dev.md` Task 4; commands moved here
2026-08-27.

**Preconditions:** dev server STOPPED (split-brain otherwise). cwd = repo root. R2 creds exported (§1).
`dev.db*` is gitignored. Preserved MCP rows only authenticate if `PAYLOAD_SECRET` is unchanged since the key
was created — verify at the end (§ step 9).

```bash
# 1. STOP dev server (must be stopped before replacing dev.db — split-brain otherwise)

# 2. PRESERVE MCP keys BEFORE the swap — DO NOT SKIP
#    (prod backup has NO payload_mcp_api_keys table — it is dev-only tooling)
#    .schema captures table + its 3 indexes; .dump|grep '^INSERT' captures escaped, order-exact rows:
sqlite3 dev.db ".schema payload_mcp_api_keys" > /tmp/mcp-schema.sql
sqlite3 dev.db ".dump payload_mcp_api_keys" | grep '^INSERT' > /tmp/mcp-inserts.sql

# 3. back up current dev.db (recovery if the swap fails mid-way)
cp dev.db "data/dumps/dev.db-pre-swap-$(date +%Y%m%d-%H%M%S).db"

# 4. list nightly backups, note latest
LATEST=$(aws s3 ls s3://schoerke-website-backup/backups/ \
  --endpoint-url "$BACKUP_R2_ENDPOINT" | sort | tail -1 | awk '{print $NF}')
echo "latest: $LATEST"

# 5. download + decompress atomically, clear stale companions
aws s3 cp "s3://schoerke-website-backup/backups/$LATEST" \
  --endpoint-url "$BACKUP_R2_ENDPOINT" ./dev.db.gz
gunzip -c dev.db.gz > dev.db.new && mv dev.db.new dev.db
rm -f dev.db-wal dev.db-shm dev.db.gz

# 6. sanity check — integrity + several key tables (not a single sample)
sqlite3 dev.db "PRAGMA integrity_check;"                                  # expect: ok
sqlite3 dev.db "SELECT 'artists', COUNT(*) FROM artists UNION ALL
                SELECT 'posts', COUNT(*) FROM posts UNION ALL
                SELECT 'search', COUNT(*) FROM search UNION ALL
                SELECT 'payload_migrations', COUNT(*) FROM payload_migrations;"
# integrity fails → delete dev.db and re-download

# 7. clear dev|-1, assert real migrations present (count == src/migrations/*.ts minus index.ts)
sqlite3 dev.db "SELECT name, batch FROM payload_migrations;"
sqlite3 dev.db "DELETE FROM payload_migrations WHERE name='dev';"
sqlite3 dev.db "SELECT COUNT(*) FROM payload_migrations WHERE name != 'dev';"
ls src/migrations/[0-9]*.ts | wc -l
# both must be 6 (each real migration = one numbered .ts; index.ts excluded). Mismatch → step 8 runs
# pending; if nothing pending, investigate — don't assume.

# 8. apply pending migrations — MUST pin env inline (bare `pnpm payload migrate` reads .env's prod pair!)
DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production pnpm payload migrate
# expect: applies missing migrations, exits 0. NODE_ENV=production here prevents pushDevSchema re-adding dev|-1.
# If it prompts interactively → dev|-1 delete failed — STOP.

# 9. restore MCP keys into the NEW dev.db (post-swap), then verify:
sqlite3 dev.db < /tmp/mcp-schema.sql
sqlite3 dev.db < /tmp/mcp-inserts.sql
sqlite3 -header -column dev.db "SELECT m.id, m.user_id, m.label, u.email FROM payload_mcp_api_keys m JOIN users u ON u.id=m.user_id;"
sqlite3 dev.db "PRAGMA foreign_key_check;"                                   # expect: empty
#    VERIFY MCP WORKS: call a payload_find* tool in opencode. 401 → PAYLOAD_SECRET changed or schema drifted;
#    fall back to re-key (admin UI) — see docs/memory/gotchas.md MCP auth + plan Task 5.
```

**Failure branches:** migrate prompts interactively → stop (dev|-1 not cleared). MCP tool returns 401 → re-key
via admin UI. Preserved rows may miss columns after a Payload bump that changes `payload_mcp_api_keys` schema →
admin render breaks → re-key.

---

## 4. Quick reference — other tasks (index table)

| Task | Trigger | Go to |
| ---- | ------- | ----- |
| Schema change / migration | edit collection config, need new migration | `docs/memory/migrations.md` |
| Run script against prod | backfill / read script, needs prod data | `docs/memory/scripts.md` |
| Write/delete prod data | data ops, import/backfill | `docs/memory/data-operations.md` |
| Restore / clone / schema-parity | prod restore, dev from prod, drift | `docs/memory/db-operations.md` §3a–§3b (restore). §3c/§4 (clone/schema-parity) deprecated — use checklists §3 |
| Confirm DB before operating | any DB op, env identity | `docs/memory/gotchas.md` |
| Full tooling command reference | need exact CLI command | `docs/memory/reference.md` |

---

**Verified:** §3 2026-08-26 (MCP preserve). §1 pattern 2026-08-26. db-operations.md retains internals:
`dev|-1` mechanism, MCP auth detail, atomic-replace rationale, FK/restore caveats.