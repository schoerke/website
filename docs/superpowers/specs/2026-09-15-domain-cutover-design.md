# Domain Cutover: ks-schoerke.de → Vercel

**Date:** 2026-09-15
**Status:** Design (approved, pending spec review)
**Scope:** Point the production domain `ks-schoerke.de` (registered and DNS-hosted at IONOS) from the legacy
WordPress site to the Vercel deployment of this Next.js application.

---

## 1. Goal & Non-Goals

### Goal

- Serve the new site at `https://ks-schoerke.de` (apex canonical), with `www` redirecting to the apex and
  `en.ks-schoerke.de` redirecting to `https://ks-schoerke.de/en`.
- Zero breakage of Microsoft 365 mail and Resend transactional email.
- Fast, well-understood rollback.

### Non-Goals

- Retiring the old WordPress hosting (kept for 1–2 weeks as rollback; separate task).
- Migrating email providers, editing SPF, or adding DMARC/CAA (out of scope; noted as follow-ups).
- Moving nameservers to Vercel (explicitly rejected — see §3).

---

## 2. Verified Current State

Domain `ks-schoerke.de`; nameservers at IONOS (`ns1102.ui-dns.*`).

| Record | Current value | Notes |
| ------ | ------------- | ----- |
| apex `A` | `217.160.0.184` | legacy WordPress (Apache, `/wp-json`) |
| `www` | `217.160.0.184` | currently 301 → apex |
| `en` `A` | `217.160.0.184` | legacy English WordPress |
| `MX` | `0 ksschoerke-de0e.mail.protection.outlook.com` | Microsoft 365 |
| apex `TXT` (SPF) | `v=spf1 ip4:93.241.69.212 include:spf.mailjet.com include:spf.protection.outlook.com ?all` | |
| apex `TXT` | `MS=ms55106733` | M365 domain verification |
| `notifications` `TXT` | `v=spf1 include:_spf.resend.com ~all` | Resend (app email) |
| `resend._domainkey.notifications` `TXT` | DKIM public key | Resend |
| `autodiscover` `CNAME` | `autodiscover.outlook.com` | M365 |
| `enterpriseenrollment` `CNAME` | `enterpriseenrollment.manage.microsoft.com` | M365 |
| `mail` `A` | `81.14.226.41` | legacy; receives no mail (MX → M365) |
| `ftp` `A` | `212.227.247.38` | legacy |
| `CAA` / `_dmarc` | none | |

Application/config facts:

- `src/utils/siteUrl.ts:1` — `DEFAULT_SITE_URL = 'https://ks-schoerke.de'`, reads `NEXT_PUBLIC_SITE_URL`.
- `NEXT_PUBLIC_SERVER_URL` — password-reset links (`src/services/email.ts:41,69`), preview URLs
  (`src/utils/preview/url.ts`), Lexical image URLs, admin-panel links. Local value is `http://localhost:3000`.
- Resend email adapter at `src/payload.config.ts:79`; sender `noreply@notifications.ks-schoerke.de`.
- Vercel: client team `eva-wagners-projects`, project `website` → `schoerke-website.vercel.app`, plan Pro.
  Local CLI user `zeitchef` is a **Member** (project control including domains; no billing).
- `vercel.json` build command `pnpm run build:ci` (runs Payload migrations on every build; idempotent).
- next-intl with `/en` locale path.
- No `serverURL`/`cors`/`csrf` in `payload.config.ts`; admin/API are same-origin.

---

## 3. Approach Decision

**Chosen: surgical IONOS DNS edit.** Keep IONOS nameservers; change only the `A`/`CNAME` records needed for the
web traffic. Mail and Resend records are never touched.

**Rejected: moving nameservers to Vercel.** Full DNS control but requires recreating every record
(M365 MX/SPF/autodiscover/`enterpriseenrollment`/`MS=` TXT and Resend SPF/DKIM). High blast radius, longer
propagation, many single points of failure. No benefit for a one-time cutover.

**Rejected: Vercel dashboard domain-redirect for `en`.** It selects a *domain* and preserves the path with no
`/en` prefix, so English users would land on German content. Use a `vercel.json` host-based redirect instead.

---

## 4. Target State

- `ks-schoerke.de` → Vercel apex `A` (value from the Vercel domain card), **canonical**, auto SSL.
- `www.ks-schoerke.de` → Vercel `CNAME` (card value), 301 → apex.
- `en.ks-schoerke.de` → Vercel `CNAME`, 301 → `https://ks-schoerke.de/en/:path*`.
- **Unchanged:** MX, SPF, `MS=ms55106733`, `autodiscover`, `enterpriseenrollment`, Resend SPF + DKIM.
- Nameservers remain IONOS. Only the apex `A`, `www`, and `en` records are edited.

---

## 5. Implementation Outline

### Phase 0 — Pre-flight (no user-visible risk)

1. Smoke-test `https://schoerke-website.vercel.app` (site, `/en`, admin login, images, uploads). Confirm the
   production deployment is green.
2. Add all three domains in the Vercel project (`ks-schoerke.de`, `www.ks-schoerke.de`, `en.ks-schoerke.de`).
3. Copy the **dashboard card** values: apex `A`, `www`/`en` `CNAME` targets, and the `_vercel` TXT token for
   each domain. Do not rely on memorized Vercel IPs.
4. Add the `_vercel.<domain>` TXT record(s) in IONOS; confirm each domain shows verified in Vercel.
5. Set Vercel env vars (Production scope): `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SERVER_URL` =
   `https://ks-schoerke.de`. Set Preview scope to `https://schoerke-website.vercel.app`. Redeploy (NEXT_PUBLIC
   values are baked at build time).
6. Confirm `ks-schoerke.de` is designated the **Production Domain**.
7. Verify R2/Blob CORS allows `https://ks-schoerke.de` (browser client uploads fail silently otherwise).
8. Export a backup of the IONOS DNS zone. Lower apex `A` and `www` TTL to 300s; wait **at least the previous
   TTL** (often 24h) before flipping.
9. Build the legacy URL redirect map (§7) and the rollback runbook (§8).

### Phase 1 — Cutover (low-traffic window, German evening)

1. Flip apex `A` → card value, and `www` (delete `A`, add `CNAME`) → card value, **together**.
2. Confirm Vercel domains show "Valid" and certificates are issued (Let's Encrypt HTTP-01 only succeeds once DNS
   points at Vercel; allow minutes).
3. Flip `en`: delete `A`, add `CNAME` → card value. Deploy the `vercel.json` host redirect (below).
4. Remove the stale IONOS `www` redirect (cosmetic; inert once `www` points at Vercel).

### Phase 2 — Verification

- `dig +short A ks-schoerke.de`, `dig +short CNAME www.ks-schoerke.de`, `dig +short MX/TXT ks-schoerke.de`
  (M365 + `MS=` + Resend intact).
- `curl -I https://ks-schoerke.de` → 200, Vercel headers, valid cert.
- `curl -I https://www.ks-schoerke.de` → single 301 to apex.
- `curl -I https://en.ks-schoerke.de/artists` → single 301 to `https://ks-schoerke.de/en/artists`.
- Mail: inbound test to `info@ks-schoerke.de`; outbound Resend test (password reset) to an external inbox.
- `/en`, `sitemap.xml`, `robots.txt`, admin login, image loading, R2 upload.
- Google Search Console: add property, submit sitemap.

### Phase 3 — Follow-up (post-cutover)

- Keep WordPress live 1–2 weeks, then retire hosting (watch for IONOS auto-DNS bindings when deleting).
- Delete legacy `mail`/`ftp` records at retirement.
- Consider DMARC (`p=none`) and CAA (`letsencrypt.org`, `pki.goog`) as separate tasks.
- Consolidate `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SERVER_URL` (smell).

---

## 6. `en` Redirect Configuration

Add to `vercel.json` (edge-level, executes before next-intl middleware, single 301):

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "en.ks-schoerke.de" }],
      "destination": "https://ks-schoerke.de/en/:path*",
      "permanent": true
    }
  ]
}
```

Notes:

- Verify the empty-path case (`/` → `/en/` trailing slash).
- Test before flipping apex:
  `curl -I --resolve en.ks-schoerke.de:443:<vercel-ip> https://en.ks-schoerke.de/artists`.
- Do **not** implement this in `middleware.ts` (host check must precede `intlMiddleware`; risks redirect loops and
  double-prefixing).
- Do **not** use the IONOS redirect (extra hop, depends on the old WordPress cert, dies at retirement).

---

## 7. Legacy URL Redirects (High Priority)

The old WordPress site exposes URLs that will 404 after cutover: `/wp-content/...`, `/wp-json/...`, old
permalinks, and `?page_id=` query strings. Search engines and inbound links reference these.

- Export the old WordPress sitemap and top-referenced URLs before cutover.
- Produce a redirect map for high-value URLs to their new-site equivalents.
- Decide mechanism (next.js `redirects()` in `next.config.mjs`, middleware, or `vercel.json`) during planning.
- This is treated as a distinct workstream with its own implementation steps; the DNS cutover is the blocking
  dependency.

---

## 8. Rollback

**Expected time: 10–30 minutes, not ~5.** TTL is a floor; resolver/browser caches can linger.

Rollback actions (pre-written runbook with exact original values):

1. Restore apex `A` → `217.160.0.184`.
2. Restore `www` → `217.160.0.184` (and re-enable the IONOS redirect if needed).
3. Revert `en` if it was flipped.

Because WordPress remains live on IONOS and both endpoints serve the domain during propagation, rollback is an
inconsistency window rather than a hard outage. Old WordPress TLS still covers the apex, so HTTPS survives the
restore.

**Rollback triggers:** TLS errors persisting > 15 minutes; deployment 5xx on the equivalent route; a domain card
stuck at "Invalid".

---

## 9. Risks

| # | Risk | Severity | Mitigation |
| - | ---- | -------- | ---------- |
| 1 | Wrong `A`/`CNAME` value (memory vs card) → Invalid Configuration, no cert, outage | Critical | Copy from dashboard card; `dig` verify; screenshot records |
| 2 | `NEXT_PUBLIC_SERVER_URL` unset in Vercel → dead reset links, broken previews | Critical | Set both vars, redeploy, test a reset email before flipping |
| 3 | `en` redirect via dashboard domain-redirect → German content at `en` host | Critical | `vercel.json` host redirect (§6); test with `curl --resolve` |
| 4 | Certificate gap after apex flip → transient TLS errors | High | Flip at low traffic; monitor domain card; keep WordPress alive |
| 5 | TTL lowered too late → slow propagation and rollback | High | Lower 24h ahead; document old TTL |
| 6 | New anycast pool IP reachability issues | High | Use card value; verify reachability (`mtr -T -P 443`) before commit |
| 7 | Old WordPress URL 404s → SEO loss | High | Legacy redirect map (§7) |
| 8 | R2/Blob CORS missing new origin → silent upload failures | Medium | Verify CORS before cutover |
| 9 | Production Domain not set to apex | Medium | Confirm designation in Vercel |
| 10 | Rollback time underestimated | Medium | Runbook; expect 10–30 min |

**Guardrails:**

- Touch only apex `A`, `www`, and `en` records. Never edit MX/SPF/DKIM.
- Do not edit SPF (`?all` is acceptable; hardening is a separate task).
- Do not add CAA at cutover (a wrong issuer list breaks certificate issuance).
- Do not click "move to Vercel nameservers".
- IONOS: delete the old `A` before adding the `CNAME` (conflict error otherwise).
- Keep WordPress live for 1–2 weeks.

---

## 10. Open Items to Verify Before Committing

- Exact apex `A` / `www` / `en` `CNAME` values from the Vercel card.
- `_vercel` TXT host and token per domain.
- IONOS redirect mechanism (hosting-level vs DNS-level).
- Current R2/Blob CORS allowed origins.
- Old WordPress HSTS/security headers (`curl -I`).

---

## 11. Verification Commands

```bash
dig +short ks-schoerke.de A                 # must equal the Vercel card value
dig +short www.ks-schoerke.de CNAME         # card value, not memory
dig +short MX ks-schoerke.de                # post-edit: M365 intact
dig +short TXT ks-schoerke.de               # SPF + MS= intact
dig +short _vercel.ks-schoerke.de TXT       # ownership verification
curl -I --resolve en.ks-schoerke.de:443:<vercel-ip> https://en.ks-schoerke.de/   # redirect test
curl -I https://217.160.0.184/ -H 'Host: ks-schoerke.de'                         # WP headers/HSTS
mtr -T -P 443 <card-ip>                     # anycast reachability
```
