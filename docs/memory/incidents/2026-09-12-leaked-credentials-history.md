# Incident 2026-09-12: Leaked Credentials in Git History (.env.vercel)

Security incident discovered while adding gitleaks secret scanning to the pre-push hook. First full-history
scan (`pnpm scan:secrets`) surfaced the leak.

---

## What Happened

`.env.vercel` — containing live cloud credentials — was committed at `1147357` (2025-11-27). The file was removed
from version control at `8f246b4` and is absent at HEAD, but the secrets persist in git history and remain
recoverable by anyone with repo access.

## Findings (gitleaks 8.30.1, `--log-opts --all --full-history`)

7 findings, all from the `.env.vercel` commit:

- AWS access key `AKIA••••••••••••••MNK5T` + AWS secret key
- 2 Vercel JWTs
- API keys

## Impact

Credentials existed in the repo's remote history since 2025-11-27. If still valid at the time of exposure, they
must be treated as compromised. The pre-push hook is unaffected (it scans pushed refs only; repo is clean at HEAD).

## Actions Taken / Pending

- **Rotation (user action, outside repo):**
  - AWS: access key `AKIA••••••••••••••MNK5T` (account `622264482405`, recovered from the key ID) was already
    **inactive**; it was the user's only access key and had no replacement — the AWS S3 setup was retired in the
    R2/Vercel Blob migration. **Deleted 2026-09-12.** No live AWS exposure.
  - Vercel: rotate the leaked JWTs/tokens in account/project settings.
  - **Still open:** Cloudflare R2 access key + secret, Turso `DATABASE_AUTH_TOKEN`, `PAYLOAD_SECRET` from the
    same `.env.vercel` dump — verify each is rotated or no longer used.
- **Documentation:** this incident file.
- **Prevention now active:** pre-push hook scans every push for secrets (`.git-hooks/pre-push` →
  `scripts/pre-push.ts`); `pnpm scan:secrets` available for periodic full-history reconciliation.
- **Not done:** history scrub. If full purge desired, rewrite history with `git filter-repo`/BFG to remove
  `.env.vercel` from all commits, then force-push with team coordination. Do NOT allowlist the leaked commits —
  allowlisting hides real secrets.
- **Open (pending):** `pnpm scan:secrets` (full-history scan) will continue to exit 1 with 7 findings until the
  `.env.vercel` commit is scrubbed from history. Key rotation already handles the live access; the history scrub
  is a separate pending decision.

## Lessons

- Never commit `.env*` files. `.env*.local` (`.gitignore` line 32), `.env.vercel` (line 73), and the `.env*`
  catch-all (line 87) are gitignored now — verify before `git add -f` or any force-add.
- Run `pnpm scan:secrets` after major merges as a periodic reconciliation check.
- Add `[[allowlists]]` entries to `.gitleaks.toml` only for verified false positives, never for real findings.
- `git push --no-verify` bypasses the pre-push hook entirely — the hook is a deterrent, not a control.