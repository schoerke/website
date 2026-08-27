# Generic Video Embed Codes + Admin-Configurable Embed Host Allowlist

> **REJECTED / SUPERSEDED** — replaced by `2026-08-27-video-embed-code-design.md`.
> The admin-configurable-allowlist approach was dropped after code review (async validator crashes admin,
> N+1 client fetches, migration, no concrete need). The allowlist stays hardcoded in code, extended with
> broadcaster hosts. See the replacement spec.

**Date:** 2026-08-27
**Status:** REJECTED — superseded

## Problem

The `VideoEmbed` block currently accepts only YouTube and arte.tv URLs, derived to an embed URL by
`getVideoEmbedData()` (`src/utils/videoEmbed.ts`). Editors cannot embed videos from other providers
(e.g. Vimeo, DailyMotion) by pasting a provider-supplied `<iframe>` embed code, as they already can for
audio via the `AudioEmbed` block's `embedCode` field.

Additionally, the iframe host allowlist (`src/utils/embeds.ts`) is hardcoded to `['rts.ch']`. Editors
cannot add/remove allowed embed hosts without a code deploy.

## Goals

1. Add an optional `embedCode` field to `VideoEmbed`, mirroring `AudioEmbed`, so editors can paste a
   provider `<iframe>` snippet.
2. Make the iframe host allowlist **admin-configurable** via a new Payload Global, while preserving
   deny-by-default security.
3. Follow existing project patterns (component, validator, server-action, global, migration) and avoid
   the pitfalls surfaced by code review.

## Non-goals

- No new `GenericEmbed`/`RawHTML` block. Reuse `VideoEmbed` (and `AudioEmbed` stays as-is otherwise).
- No removal of `rts.ch` from the code baseline allowlist.
- No changes to the YouTube/arte.tv URL path behavior.

## Current state (verified)

- `src/blocks/VideoEmbed.ts`: single `url` text field, `required: true`, validated by `validateVideoURL`
  (YouTube + arte.tv only). `VideoEmbedBlockFields { url: string; aspectRatio?: ... }`.
- `src/blocks/AudioEmbed.ts`: has `url` + `embedCode`, mutually exclusive via admin `condition`, validated
  by `validateAudioURL` / `validateEmbedCode` (`src/validators/audioFields.ts`).
- `src/utils/audioEmbed.ts`: exports `parseIframeEmbed`, `IFRAME_TAG`, `IFRAME_ATTR`, `ParsedIframe`.
- `src/utils/embeds.ts`: `ALLOWED_EMBED_HOSTS = ['rts.ch'] as const`, `isEmbedHostAllowed(hostname)`.
- `src/components/blocks/VideoEmbed.tsx`: `'use client'`, sync render via `getVideoEmbedData(url)`.
- `src/components/ui/PayloadRichText.tsx`: `'use client'`, maps `videoEmbed`/`audioEmbed` blocks to the
  client components. Consumed by server and client parents.
- Validators: `src/validators/fields.ts` (sync), `src/validators/audioFields.ts` (sync, siblingData).
- Block data for VideoEmbed/AudioEmbed lives inline in the lexical `content` JSON — **no DB table**.
  Prior audio-embed iframe work added `embedCode` to AudioEmbed with **no migration**.

## Design decisions (from brainstorming + code review)

### Scope: three independent plans

| Plan | Concern | Migration? |
|------|---------|-----------|
| **A** | `embedCode` field on VideoEmbed + validator + render branch (mirror AudioEmbed) | No |
| **B** | New `embed-settings` Global (`allowedEmbedHosts`) + service + types regen | **Yes** |
| **C** | Union wiring: pure allowlist fn, `beforeChange` hook, one-per-page client provider | No |

Landing order: A → B → C. A delivers value with zero migration and no dependency on B/C. B and C must
both land together (both need the Global + schema).

### Blocking review findings addressed

1. **Async validator crashes admin.** Payload field `validate` runs on both server and admin client; the
   client passes `req.payload` as only `{ config }` (no `findGlobal`). So `validate` **must stay sync** and
   check only the code-default allowlist. The authoritative union (code-default + Global) check moves to a
   **collection `beforeChange` hook**, which has a real server `req` (`req.payload.findGlobal`), mirroring
   `src/collections/hooks/blockDuplicateSlug.ts`.
2. **N+1 server actions.** Fetching the allowlist inside each `VideoEmbed` would issue one POST per embed
   per page. Hoist to a **single fetch per page** via a client provider/context mounted once above
   `PayloadRichText`. Server action returns only `string[]`.
3. **Union regression foot-gun.** If the Global fetch fails or is empty, falling back to only `['rts.ch']`
   would silently break previously-valid embeds. Make `isEmbedHostAllowed` pure and take the allowlist as an
   argument; keep `rts.ch` as a permanent code baseline (never removable from code); on failure, log and
   fall back to code-default-only — explicit, never silent. Deny-by-default preserved (degraded = restrictive,
   never permissive).

---

## Plan A — `embedCode` field on VideoEmbed

### Block config (`src/blocks/VideoEmbed.ts`)

- `VideoEmbedBlockFields`: add `embedCode?: string`; `url` becomes `url?: string`.
- Add `embedCode` textarea field:
  - `admin.condition: (_, siblingData) => !siblingData?.url`
  - `placeholder`: `<iframe src="https://player.vimeo.com/video/123456" ...></iframe>`
  - `validate`: new `validateVideoEmbedCode`
  - `rows: 4`
- `url` field: drop `required: true` → `required: false`; add
  `admin.condition: (_, siblingData) => !siblingData?.embedCode`; update `validate` to allow empty when
  `embedCode` set.
- Update block JSDoc to document `embedCode` (supported: any allowlisted iframe host).

### Validation (`src/validators/videoFields.ts`)

New module mirroring `audioFields.ts`:

- `validateVideoEmbedCode(value, { siblingData })` — **sync**, code-default allowlist only:
  - empty allowed when sibling `url` set
  - both-empty rejected
  - must match `IFRAME_TAG`, extract `src` via `IFRAME_ATTR('src')`
  - `https:` protocol required
  - `isEmbedHostAllowed(host, ALLOWED_EMBED_HOSTS)` check
- `validateVideoURL` in `src/validators/fields.ts`:
  - add empty-allowed-when-`embedCode`-set branch (copy `audioFields.ts` pattern)
  - both-empty rejected

### Render (`src/components/blocks/VideoEmbed.tsx`)

- Props: add `embedCode?: string`.
- Null-guard: `if (!url && !embedCode) return null`.
- `embedCode` branch (mirror `AudioEmbed.tsx` embedCode branch):
  - `parseIframeEmbed(embedCode)`; if null → error box
  - defense-in-depth: `https?` + `isEmbedHostAllowed(host, <resolved allowlist>)`
  - render iframe with parsed `width`/`height` (fallback height), **not** the aspect-ratio padding box
  - hand-built iframe (only `src`/dims/`title`), `sandbox`, `allow`, `loading="lazy"` — never spread raw code
- URL branch: unchanged (keeps aspect-ratio box).

### `PayloadRichText.tsx` mapping

- `videoEmbed` converter passes `embedCode` through: `<VideoEmbed url embedCode aspectRatio locale />`.

### Plan A tests

- `src/validators/videoFields.spec.ts` (mirror `audioFields.spec.ts`): empty-url-allowed-when-embedCode,
  both-empty rejected, non-iframe/evil-host rejected, data-src spoof.
- `src/utils/embeds.spec.ts`: extend for array-arg signature.
- `VideoEmbed` render test: embedCode renders iframe when allowed; error box when host not allowed;
  respects parsed width/height; null-guard on both-empty.
- `PayloadRichText` mapping test: `embedCode` passed through.

---

## Plan B — `embed-settings` Global

### Global (`src/globals/EmbedSettings.ts`)

- `slug: 'embed-settings'`, `admin.group: 'Content Management'`.
- Access: `read: authenticatedOrPublished`, `update: authenticated` (mirror `HomePage`).
- Field `allowedEmbedHosts`:
  - `type: 'array'`, single text subfield, required items
  - description: "Allowed iframe embed hosts, e.g. vimeo.com, dailymotion.com. These are added on top of
    the built-in `rts.ch` baseline."
- Hooks: `afterChange` revalidation if applicable (mirror `revalidateHomePageOnGlobalChange` pattern if a
  revalidate is desired).

### Service (`src/services/embedSettings.ts`)

- `getAllowedEmbedHosts(): Promise<string[]>` using `payload.findGlobal({ slug: 'embed-settings' })`
  (mirror `src/services/homePage.ts`).
- Returns code-default `['rts.ch']` unioned with Global entries (dedup).

### Schema / migration

- New Global → new tables. **Requires migration.**
- `payload migrate:create <name>`, review generated `up()`/`down()` SQL, add idempotent guard
  (CREATE TABLE IF NOT EXISTS), apply to prod via `build:ci` (see `docs/memory/migrations.md`).
- Regen `src/payload-types.ts` via `payload generate:types`.

### Plan B tests

- `src/services/embedSettings.spec.ts`: mock `findGlobal` (mirror `homePage`/`page` service tests);
  union semantics, dedup, empty-Global fallback.

---

## Plan C — Union wiring

### Pure allowlist helper (`src/utils/embeds.ts`)

- Change signature: `isEmbedHostAllowed(hostname: string, allowedHosts: readonly string[]): boolean`.
- Keep `ALLOWED_EMBED_HOSTS = ['rts.ch'] as const` as the permanent code baseline.
- Add `buildEmbedHostAllowlist(globalHosts: string[]): string[]` = dedup union of baseline + global.
- Update existing call sites in `audioFields.ts`, `AudioEmbed.tsx` to pass the baseline/union explicitly.

### Collection `beforeChange` hook (authoritative union check)

- New hook (e.g. `src/collections/hooks/validateEmbedHosts.ts`): `CollectionBeforeChangeHook`.
- On save, scan rich-text `content` blocks for `videoEmbed`/`audioEmbed` `embedCode` fields; extract
  `src` hosts; reject any not in the **union** (baseline + `req.payload.findGlobal('embed-settings')`).
- Only scans embed blocks, not the whole doc. Throws `APIError` on disallowed host (mirror
  `blockDuplicateSlug`).
- Registered on the collections that carry `content` with these blocks (Posts, Repertoire — same set that
  register VideoEmbed/AudioEmbed; confirm exact collections).
- Sync field validator stays code-default-only (Plan A) to avoid admin crash; this hook is the
  authoritative DB-aware check.

### One-per-page client provider

- New client provider (e.g. `src/components/EmbedHosts/EmbedHostsProvider.tsx`) that fetches the union
  once via a server action and exposes it via context.
- Server action `src/actions/embeds.ts`: `fetchAllowedEmbedHosts(): Promise<string[]>` returns only the
  resolved allowlist array (`'use server'`, JSDoc).
- Mount provider once above `PayloadRichText` in the consuming layouts: `StaticPageLayout`,
  `ContactPageLayout`, `ArtistTabContent`, `PostDetailContent`, `RecordingDetailsDialog`.
- `VideoEmbed`/`AudioEmbed` read allowlist from context for their defense-in-depth re-check.
- Failure policy: on fetch error/empty, log (console.error like existing `[VideoEmbed]`/`[AudioEmbed]`)
  and use code-default-only. Degraded = restrictive, never permissive.

### Plan C tests

- `src/actions/embeds.spec.ts`: server action returns union array.
- Hook test: mock `req.payload.findGlobal`; allows union host, rejects non-union, Global-fetch-failure →
  code-default fallback (deny), does not break non-embed docs.
- Provider/context test: exposes allowlist; single fetch per mount.

---

## Security notes

- Output iframe is always hand-built with only `src`/width/height/`title` — dangerous attrs (`srcdoc`,
  `onload`, others) are never copied from the pasted snippet. `parseIframeEmbed` already scopes extraction.
- Hostname allowlist is the control; deny-by-default with `rts.ch` baseline never removable from code.
- Global access `authenticated` update only; description warns "only add trusted providers".
- Video `embedCode` requires `https:` (stricter than AudioEmbed's `http(s)`).
- `sandbox="allow-scripts allow-same-origin allow-popups"` maintained (standard trusted-provider tradeoff).

## Rollout / verification

- `pnpm lint`, `pnpm test`, `pnpm build` after each plan.
- Plan B: pre-flight migration SQL against a local prod snapshot before trusting (docs/memory/migrations.md);
  idempotency required (build:ci re-runs on every Vercel build).
- Manual: admin adds a Vimeo embed via embedCode; verify render + save validation; add `vimeo.com` to
  Global; verify previously-blocked host now allowed.

## Open questions

- Confirm exact collections carrying `content` with VideoEmbed/AudioEmbed blocks (Posts, Repertoire today;
  check Guides, Pages) — the `beforeChange` hook must be registered on all of them.
- Whether `afterChange` revalidation is desired for the Global (affects caching of the allowlist).
