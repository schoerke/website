# Incident 2026-08-24: Post 215 Desync + Slug Collisions

Operational incident write-up. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §14.

---

## Symptom

Client reported a Poltéra/Juho project post that "doesn't show up at all". Present in admin, blank on site.

## Root Cause

**Two compounding bugs:**

1. **Version/live desync** — post 215's live `posts_locales` rows were empty (title/slug/content/artists wiped);
   full content survived only in `_posts_v` versions. Admin reads versions; frontend reads live.
2. **Slug collision** — post 198 (Mara project) held the EN slug `christian-poltera-and-juho-pohjonen` that
   belonged to post 215. `unique: true` made publishing 215 fail with a generic "invalid slug" error.

## Fix

**Local (dev):** (1) freed 198's EN slug → `christian-poltera-and-wolf-wondratschek-the-mara` via Local API with
inline env targeting local `dev.db`; (2) published 215 in admin → version promoted to live.

**Prod (2026-08-24):** same empty-215 + 198-slug-collision present. Fixed both on prod (198 EN slug freed via
Local API, 215 published), plus 39/193/184/197 (197 EN was a Mara-content duplicate — rewrote from DE as the
Münchener Kammerorchester translation), plus 20+ garbage slugs regenerated from titles, plus post 247
(EN-only news post whose live locales never committed — version had content, live empty; wrote version → live).

## Post-247 Root Cause

Post-247 root cause: create+publish at 10:27:17→10:27:31 wrote relationships but the locale commit failed
(transient "backend painfully slow" window), leaving `posts_locales` empty with `published_locale: null`.

## Guards

See docs/memory/gotchas.md (drafts/live, slug collisions) and docs/memory/environments.md (two-dev-DB trap).

