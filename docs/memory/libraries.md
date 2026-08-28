# Libraries

Library-specific knowledge (Payload search, WordPress migration, Vercel Blob). Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §13.1–§13.6.

---

## Library-Specific Knowledge

### 13.1 Payload Search Plugin with Localization

- `localize: true` makes the SEARCH collection itself localized (not the source collections).
- The plugin's `afterChange` hook fires once per API request, using `req.locale`.
- Each search record is created with a specific `locale`; to index multiple locales, make separate API calls per
  locale (create EN, then update DE — this yields two search records).
- **When confused about plugin behavior:** DO NOT guess. Check the plugin source on GitHub
  (`packages/plugin-search/src/`) or official template examples. Read the implementation, not just types.

### 13.2 WordPress Migration Data Integrity

**Preserve the original data structure unless explicitly told otherwise.** Never make broad assumptions about data
cleanup during migrations. Example (2025-11-25): an agent tried to globally filter "Chamber Music" from artists'
instruments, affecting ALL artists — the correct approach is to fix only specific artists when explicitly
requested.

- Migrate data as-is; fix specific records with targeted scripts; ask before cleanup; document exceptions in the
  migration script.

### 13.3 WordPress Migration File Uploads

**Verify media files are uploaded to Payload BEFORE running migrations that reference them.** Common failure
(2025-11-30): "FOREIGN KEY constraint failed" when linking to images that don't exist, because
`media-id-map.json` held stale IDs, files weren't uploaded to storage, or WordPress attachment IDs didn't resolve.

Resolution: check existing uploads (`payload.count({ collection: 'images' })`), verify mapped IDs exist, upload
missing files via `payload.create({ collection: 'images', data, filePath })`, update `media-id-map.json`, re-run.

### 13.4 WordPress Filename Timestamp Postfixes

WordPress appends `-e[timestamp]` to edited filenames (e.g.
`Mario-Venzago-1_c-Alberto-Venzago-e1762933634869.jpg`). Migration scripts MUST clean these via
`cleanWordPressFilename()` from `scripts/wordpress/utils/fieldMappers.ts`, or the DB accumulates clutter.

### 13.5 Vercel Blob Storage and Bandwidth

Vercel Blob free tier: 10 GB/month bandwidth. Large files (ZIPs 40-60 MB) exhaust it fast. Prefer Cloudflare R2
(unlimited egress) for large downloads; keep small images/PDFs in Vercel Blob. Audit with
`tmp/analyzeBlobUsage.ts`. See `docs/todo.md` for the migration plan. **Files live in R2; the DB stores only the doc
id.** So a migration that moves only references (e.g. id re-pointing) never touches the actual files — no file/R2
backup needed for such reference-only migrations; a DB snapshot suffices.

### 13.6 Vercel Blob Operation Limits (Simple/Advanced)

Hobby caps: **Simple ops 10k/month**, **Advanced ops 2k/month** (1 GB storage, 10 GB transfer). Exceeding = **no
billing, but Blob inaccessible until 30-day window resets** → images 404 site-wide. Simple op = **URL access cache
MISS** or **every `head()` call**. Advanced op = `put()`/`copy()`/`list()` (uploads). Critical: the
`@payloadcms/storage-vercel-blob` static handler (`getFile`) calls `head()` **on every request** to
`/api/images/file/*` — so **admin CMS browsing burns 1 Simple op per image rendered**, cache HITs don't help.
Uploading ~100 images ≈ 100 Advanced + ~200 Simple; thousands of ops ≠ image count, it's admin `head()` traffic +
public cache-miss/eviction traffic. Dashboard per-day data is capped at 12h on Hobby. Fix: Pro trial (100k/10k
included) or move images to R2. Vercel usage API: `GET /v2/team/{teamId}/usage`.

**Client uploads (`clientUploads: true`, images since 2026-08-28):** the browser PUTs directly to Blob, so the
upload itself counts **1 Advanced op per file** and incurs **no data transfer charge** (per Vercel's docs —
external claim, verify at write time if it matters). Server uploads instead incur Fast Data Transfer. Dev + prod
share the same store (`store_3jIBiIxvBnjU5oC1`), so dev admin activity counts against the same quota — dev image
writes (uploads, renames, deletes) hit the **prod** store; guard destructive scripts. Documents client uploads are
gated behind `DOCUMENT_CLIENT_UPLOADS=true` (needs R2 CORS for PUT first).

### 13.7 Vercel Security Checkpoint blocks server-to-server blob fetches (2026-08-26)

Vercel's edge **Security Checkpoint** intermittently challenges Node/undici fetches to `*.public.blob.vercel-storage.com`
with a **403** ("Vercel Security Checkpoint" HTML), while curl/browser requests pass. Server-to-server fetches from the
**dev machine** (and any non-Vercel network) hit it ~50% of the time.

Impact on the Payload admin edit flow: on a crop/focal save Payload re-processes the file — the client hits
`/api/images/file/*` → `getFile.js` re-fetches the blob; any `!ok` blob fetch is masked as a **204 empty response**
→ the crop re-encode gets an empty buffer → sharp fails with
**`VipsJpeg: premature end of JPEG image`** → admin shows **"There was a problem uploading the file."** The blob itself
is fine (direct fetch 200). Intermittent, dev-only — production Vercel-function→Blob fetches are internal and unaffected.

- Verify: `curl` the blob URL (200) vs Node `fetch` (alternating 200/403).
- Fix: Vercel dashboard → Project → Settings → Security → disable **Security Checkpoint** (or whitelist the blob host).
- Long-term: move images to R2 (no checkpoint, unlimited egress — see §13.5, `docs/todo.md`).
- NOTE: this also intermittently breaks `/api/images/file/*` serving in dev (204 empty → broken frontend images).
