# Domain Cutover Runbook — ks-schoerke.de → Vercel

Companion to `docs/superpowers/specs/2026-09-15-domain-cutover-design.md` and
`docs/superpowers/plans/2026-09-18-domain-cutover.md`.
Corrections vs. the spec: DNS flip happens BEFORE the env change (C1); explicit 301s (C3/C4);
rollback reverts env (H1); legacy redirects are deployed first (H2); apex/`www`/`en` `AAAA`
records handled explicitly (C5, not addressed by the original spec).

## Confirmed preconditions (2026-09-18)

- `DOCUMENT_CLIENT_UPLOADS=true` in Vercel Production/Preview → browser uploads PUT directly to
  R2, so R2 bucket CORS must include every origin that serves the admin UI.
- R2 bucket `schoerke-website` CORS **updated** to:
  ```json
  [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "https://schoerke-website.vercel.app",
        "https://ks-schoerke.de",
        "https://www.ks-schoerke.de",
        "https://en.ks-schoerke.de"
      ],
      "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```
  Applied to the live bucket ahead of the DNS flip — harmless (`ks-schoerke.de` doesn't point at
  Vercel yet, so the new origins are inert until cutover).
- Other storage env vars confirmed present in Vercel Production: `NEXT_PUBLIC_R2_HOSTNAME`,
  `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_S3_HOSTNAME`.
- `NEXT_PUBLIC_SERVER_URL` exists in Production/Preview/Development; `NEXT_PUBLIC_SITE_URL` does
  not exist anywhere (code defaults to `https://ks-schoerke.de`, harmless pre-cutover).
- In-content legacy links (posts 258, 47) were manually fixed by the user directly in the
  production admin — verified via read-only Payload Local API query, no longer present. No script
  needed; dropped from this plan.
- A code review after Task 6 caught a real ordering bug: the legacy catch-all redirect briefly
  shadowed all 322 specific legacy-content redirects (would have 301'd every legacy artist/news/
  project URL to `/de/news` instead of its real page). Fixed by reordering `allRedirects`
  (catch-all now genuinely last) and adding a regression test that checks position in the final
  array, not just within `staticLegacyRedirects`. Also fixed: the catch-all's reserved-word
  exclusion was a prefix match, not an exact-segment match — `delmenhorst-*`, `den-haag-*`,
  `engers-schloss`, `enschede-*` (4 real legacy URLs) would have silently 404'd instead of
  redirecting. Both fixes verified against Vercel's actual bundled `path-to-regexp-updated` parser,
  not just Node's built-in `RegExp`.
- The reserved-segment list (`RESERVED_SEGMENTS` in `src/config/vercelRedirects.ts`) is
  cross-checked by a spec test against the real `src/app/(frontend)/**` top-level route tree — if
  a new top-level page is added without updating that list, the test fails instead of the route
  silently breaking in production.
- Two slugs (`monet-quintett`, `zehetmair-quartett`) exist as both an artist and a news/project
  post; `buildLegacyRedirects.ts` now warns about this instead of silently picking one (current
  precedence: news > projects > artists).

## Safety rails

- Touch ONLY apex `A`/`AAAA`, `www` `A`/`AAAA`/`CNAME`, `en` `A`/`AAAA`/`CNAME` at IONOS. NEVER edit MX/SPF/DKIM/`MS=`.
- **Never touch** (confirmed present, out of scope): `mail.*` (own `MX → kundenserver.de`, `autodiscover.mail`, `ftp.mail`, `www.mail` — a live separate IONOS mailbox), `ftp`, `journal` (undocumented — ask before WordPress retirement), `_domainconnect`, `mailjet._domainkey`, `notifications`/`send.notifications` (Resend + its SES bounce handling), `autodiscover`, `enterpriseenrollment`, `enterpriseregistration`, `lyncdiscover`, `sip`, `_sipfederationtls._tcp`, `_sip._tls`.
- Do not add CAA records. Do not move nameservers.
- IONOS: delete the old `A`/`AAAA` before adding the `CNAME` (conflict error otherwise).
- All DNS edits are done by the user directly in the IONOS dashboard — the agent has no IONOS
  access. Vercel/env changes are agent-executable but gated on explicit approval per step.

## Phase 0 — Pre-flight (no user-visible risk)

1. `pnpm seo:vercel && pnpm vitest run src/config/vercelRedirects.spec.ts` — redirects green.
2. `vercel.json` legacy redirects committed + deployed to production (safe: inert until a request
   arrives with a host header pointing at Vercel, which can't happen before DNS changes).
3. Add all three domains in the Vercel project: `ks-schoerke.de`, `www.ks-schoerke.de`, `en.ks-schoerke.de`.
4. Copy the dashboard card values (apex `A`, `www`/`en` `CNAME`, `_vercel` TXT per domain, and any
   published `AAAA` value). Do not use memorized IPs.
5. Add `_vercel.<domain>` TXT records at IONOS; confirm each domain shows Verified in Vercel.
6. Set `ks-schoerke.de` as the Production Domain.
7. Confirm Deployment Protection is OFF for Production (public site must not gate behind SSO).
8. R2 CORS — done (see "Confirmed preconditions" above).
9. Check whether Vercel publishes an `AAAA`/IPv6 value for the apex domain card. If yes, note it
   for Phase 1 step 0. If no (common on custom domains today), plan to delete the apex/`www`/`en`
   `AAAA` records at cutover — IPv6 clients fall back to IPv4 (Happy Eyeballs); leaving the old
   `AAAA` in place would silently keep serving WordPress to IPv6 clients.
10. Export the IONOS DNS zone (captures current `AAAA` values for rollback). Lower apex `A`/`AAAA`
    and `www` TTL to 300s; wait ≥ the previous TTL (often 24h).
11. Probe the Vercel edge before the flip (replace `<card-ip>`):
    ```bash
    curl -I --resolve ks-schoerke.de:443:<card-ip> https://ks-schoerke.de/
    curl -I --resolve www.ks-schoerke.de:443:<card-ip> https://www.ks-schoerke.de/
    curl -I --resolve en.ks-schoerke.de:443:<card-ip> https://en.ks-schoerke.de/artists
    ```
    Expected: apex 3xx → `/de`; www single 301 → apex; en single 301 → `https://ks-schoerke.de/en/artists`. If en double-hops, fix redirects before flipping.
12. Verify a document upload from a preview deploy still works after the CORS change (regression
    check — confirms the CORS update didn't break the existing `vercel.app`/`localhost` origins).

## Phase 1 — Cutover (low-traffic German evening)

0. Delete the legacy `AAAA` records on apex, `www`, and `en` (or replace with Vercel's card AAAA
   value if one exists — Phase 0 step 9). Do this together with step 1.
1. Flip apex `A` → card value AND `www` (delete `A`, add `CNAME` → card value) TOGETHER.
2. Wait for Vercel domains to show Valid; Let's Encrypt issues once DNS points at Vercel (allow minutes).
3. Flip `en`: delete `A`, add `CNAME` → card value.
4. Verify certificates + redirects:
    ```bash
    curl -I https://ks-schoerke.de/                       # 3xx -> /de then 200
    curl -I https://www.ks-schoerke.de/                   # single 301 -> https://ks-schoerke.de/
    curl -I https://en.ks-schoerke.de/artists             # single 301 -> https://ks-schoerke.de/en/artists
    curl -I https://en.ks-schoerke.de/?a=1                # query preserved, no loop
    dig +short AAAA ks-schoerke.de                        # empty, or Vercel's published value — never the old 2001:8d8:...
    ```

## Phase 2 — Set public env, then redeploy (C1)

Only AFTER DNS + certs are confirmed:

1. Vercel → Settings → Environment Variables.
   - Production: `NEXT_PUBLIC_SERVER_URL=https://ks-schoerke.de` and `NEXT_PUBLIC_SITE_URL=https://ks-schoerke.de`.
   - Preview: `NEXT_PUBLIC_SERVER_URL=https://schoerke-website.vercel.app` and `NEXT_PUBLIC_SITE_URL=https://schoerke-website.vercel.app`.
2. Redeploy production (`NEXT_PUBLIC_*` values are baked at build time).
3. Verify:
   - Password reset email: request one, confirm the button + logo resolve on `https://ks-schoerke.de/...`, then complete a reset.
   - Payload live preview from the apex admin.
   - `/en`, `sitemap.xml`, `robots.txt`, admin login, an image, and a document upload/download (the R2 CORS path).

## Phase 3 — Verification

```bash
dig +short A ks-schoerke.de
dig +short CNAME www.ks-schoerke.de
dig +short CNAME en.ks-schoerke.de
dig +short MX ks-schoerke.de
dig +short TXT ks-schoerke.de
dig +short TXT notifications.ks-schoerke.de
dig +short TXT resend._domainkey.notifications.ks-schoerke.de
curl -sI https://ks-schoerke.de/ | grep -i strict-transport-security
```
Expected: apex = card IP; `www`/`en` = card CNAME; MX/SPF/`MS=`/Resend intact; HSTS header noted (see below).

Mail: inbound test to `info@ks-schoerke.de`; outbound Resend test (password reset) to an external inbox.
Search Console: add `ks-schoerke.de`, submit `sitemap.xml`.

## HSTS (H3)

The `vercel.app` host returns `strict-transport-security: max-age=63072000; includeSubDomains; preload`.
Custom domains get Vercel-managed HSTS scoped per-subdomain. Browsers cache this for 2 years.
If a conservative value is preferred before cutover, override via `vercel.json`:
```json
{
  "headers": [
    { "source": "/(.*)", "headers": [{ "key": "Strict-Transport-Security", "value": "max-age=31536000" }] }
  ]
}
```
Do NOT submit to the preload list. Restoring to HTTP-only WordPress after an HSTS cache is set will cause browser errors — another reason rollback must be quick.

## Rollback

Expected 10–30 minutes (TTL is a floor; resolver/browser caches linger). WordPress stays live during propagation, so this is an inconsistency window, not a hard outage.

1. Restore apex `A` → `217.160.0.184` and `AAAA` → `2001:8d8:100f:f000:0:0:0:2bb`.
2. Restore `www` → `217.160.0.184` / `AAAA` → `2001:8d8:100f:f000:0:0:0:2bb` (and re-enable the IONOS redirect if it was removed).
3. Revert `en` (`A`/`AAAA`) if it was flipped.
4. **Revert env (H1):** set Production `NEXT_PUBLIC_SERVER_URL` and `NEXT_PUBLIC_SITE_URL` back to `https://schoerke-website.vercel.app`, then redeploy. Without this, reset/preview links keep pointing at the old apex.
5. Vercel domains/certs can be left in place (harmless). R2 CORS additions can also be left in place (harmless — they only add allowed origins, they don't remove any).

Triggers: TLS errors > 15 min; deployment 5xx on an equivalent route; a domain card stuck Invalid.

## Post-cutover follow-ups

- Keep WordPress live 1–2 weeks, then retire hosting (watch IONOS auto-DNS bindings when deleting).
- **Do not delete `mail`/`ftp` blindly** — `mail.ks-schoerke.de` is a live separate IONOS mailbox (its own MX to `kundenserver.de`, confirmed via IONOS dashboard 2026-09-18), not dead weight. Confirm with the user whether it's still in use before touching it at retirement.
- Ask the user what the undocumented `journal` A record (`93.241.69.212`) is before retiring anything on that IP.
- Consider DMARC (`p=none`) and CAA (`letsencrypt.org`, `pki.goog`) as separate tasks.
- Consolidate `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SERVER_URL` (smell).
- Re-run `pnpm seo:redirects` closer to the actual cutover date: the WordPress `wp-sitemap-posts-post-2.xml` sub-sitemap 404'd during this plan's execution (2026-09-18) and was skipped (~1000 URLs); confirm it's back before finalizing the legacy redirect map.
