# Generic Video Embed Codes (VideoEmbed `embedCode` field)

**Date:** 2026-08-27
**Status:** Approved (revised single-plan after code review)
**Supersedes:** `2026-08-27-video-embed-code-admin-allowlist-design.md` (admin-configurable-allowlist idea — REJECTED)

## Problem

The `VideoEmbed` block accepts only YouTube and arte.tv URLs, derived to an embed URL by
`getVideoEmbedData()` (`src/utils/videoEmbed.ts`). Editors cannot embed videos from other providers (RSI,
ARD Mediathek) by pasting a provider-supplied `<iframe>` embed code, even though the `AudioEmbed` block
already supports this via its `embedCode` field.

## Decision (from brainstorming + 2 code reviews)

Mirror the existing `AudioEmbed` block exactly: add an optional `embedCode` field to `VideoEmbed`.

- **NO admin-configurable allowlist** — dropped. The iframe host allowlist stays **hardcoded in code**,
  extended with the broadcaster hosts actually needed. Editors cannot add hosts; devs do via deploy.
  Rationale: the real need is a small fixed set of trusted German/Swiss public broadcasters; an admin
  Global would add a migration + async client fetch + N+1 risk (all flagged in review) for marginal benefit.
- **NO migration** — see "Migration claim" below (verified).
- **NO async** — validator stays sync (avoids the admin `req.payload` crash), render stays sync (no N+1).

### Verified use cases driving the allowlist

- **RSI** (`rsi.ch`): iframe embed `https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761` — confirmed
  embed URL format on the provided Maurice Steger RSI page.
- **ARD Mediathek** (`ardmediathek.de`): iframe embed `https://www.ardmediathek.de/embed/<crid>?clientType=...`
  — confirmed format on ard.de.
- **RTS** (`rts.ch`): already allowlisted (audio, reused for video).
- **NDR article pages** (`ndr.de`): the ARD Player is JS-bootstrapped from a `data-config` JSON attr, NOT an
  `<iframe src>` — **no embed code to paste**. Editors must grab the same video's embed from the ARD
  Mediathek instead. Out of scope for the embedCode path.

## Migration claim (VERIFIED — no migration needed)

VideoEmbed/AudioEmbed are lexical `BlocksFeature` blocks stored as JSON in the richText `content` column.
They have **no dedicated DB tables**:

- `grep` of `src/payload-generated-schema.ts`, the baseline migration
  `src/migrations/20260815_124301_baseline.json`, and all 7 migration files → **0 references** to
  `videoEmbed`/`audioEmbed`/`embedCode`. Blocks are invisible to Drizzle schema diffing.
- Precedent: AudioEmbed's `embedCode` field landed 2026-08-18 (commit `39156dc`) with **zero migrations**,
  prod live since.
- `url` `required: true → false` is a **validation-level** flag only; block fields live in JSON, no NOT NULL.
- Versions tables (`_posts_v_locales.version_content`) store old/new JSON shapes; renderer tolerates missing
  `embedCode` (→ `undefined` → null-guard). No schema concern.
- `payload generate:types` is pure typegen (no DB connection). Run it post-change as hygiene.

## Scope (single plan)

### 1. Block config — `src/blocks/VideoEmbed.ts`

- `VideoEmbedBlockFields`: add `embedCode?: string`; `url` → `url?: string`.
- `url` field: `required: true` → `required: false`; add
  `admin.condition: (_, siblingData) => !siblingData?.embedCode`; update `validate` to allow empty when
  `embedCode` set.
- Add `embedCode` textarea field (mirror `AudioEmbed.ts` lines 59-77):
  - `admin.condition: (_, siblingData) => !siblingData?.url`
  - `placeholder`: `<iframe src="https://www.ardmediathek.de/embed/Y3JpZDov..."></iframe>`
  - `validate`: `validateVideoEmbedCode`
  - `rows: 4`
- Update block JSDoc: supported = YouTube, arte.tv URLs; OR embed code from allowlisted iframe hosts.

### 2. Validation — `src/validators/videoFields.ts` (new) + `src/validators/fields.ts`

**`validateVideoEmbedCode(value, { siblingData })`** — sync, mirrors `audioFields.ts` `validateEmbedCode`
(lines 96-127):
- empty allowed when sibling `url` set
- both-empty rejected: `'Please enter either a video URL or an embed code'`
- must match `IFRAME_TAG`; extract `src` via `IFRAME_ATTR('src')`
- `https:` protocol required
- `isEmbedHostAllowed(host, ALLOWED_EMBED_HOSTS)` check → `'Embed iframe host is not allowed'`

**`validateVideoURL`** in `src/validators/fields.ts` — signature MUST change:
- from `(value: unknown)` to `(value: unknown, { siblingData }: { siblingData?: { url?: unknown; embedCode?: unknown } } = {})` (mirror `audioFields.ts:36`)
- add empty-allowed-when-`embedCode`-set branch BEFORE the `typeof` check (else `''` hits `typeof` reject)
- **shared-validator ripple:** `validateVideoURL` is ALSO used by `Artists.ts:293` `videoLinks` array item
  (`url`, required: true). Array-item validation context = item object `{ label, url }` — no `embedCode`
  key → empty-allowed branch never triggers → Artists behavior unchanged. All existing `fields.spec.ts`
  single-arg calls → default `{}` → unchanged. Safe; add regression tests.

### 3. Allowlist — `src/utils/embeds.ts`

- Extend `ALLOWED_EMBED_HOSTS` from `['rts.ch']` to `['rts.ch', 'rsi.ch', 'ardmediathek.de']`.
- `isEmbedHostAllowed` stays single-arg (hardcoded const). `rts.ch` must remain.
- **Implementation note:** verify the actual `src` host in real pasted ARD/RTS video embeds (may be
  `mediathek.daserste.de`, `api.ardmediathek.de`, etc.). Add any such host.

### 4. Render — `src/components/blocks/VideoEmbed.tsx`

- Props: add `embedCode?: string`.
- Null-guard: `if (!url && !embedCode) return null`.
- `embedCode` branch (mirror `AudioEmbed.tsx` lines 18-71) with VIDEO-specific fixes:
  - `parseIframeEmbed(embedCode)`; null → error box
  - defense-in-depth: `^https?` + `isEmbedHostAllowed(host)` → else error box
  - iframe: `src`, `title`, `width="100%"` ALWAYS (parseIframeEmbed drops `width="100%"` → NaN),
    `height={parsed.height ?? <default 16:9 video height e.g. 315>}`, `frameBorder="0"`, `loading="lazy"`
  - **`allowFullScreen` + `allow="autoplay; encrypted-media; fullscreen; picture-in-picture"`** — video
    MUST include fullscreen (audio branch correctly omits it)
  - `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"`
  - hand-built iframe (only src/dims/title) — junk attrs dropped, React escapes
- URL branch: unchanged (keeps aspect-ratio padding box).

### 5. Rich-text mapping — `src/components/ui/PayloadRichText.tsx`

- `videoEmbed` converter (line 169-172): pass `embedCode` through:
  `<VideoEmbed url={url} embedCode={embedCode} aspectRatio={aspectRatio} locale={...} />`.

### 6. Typegen

- Run `pnpm payload generate:types` (hygiene, non-DB). No `generate:importmap` (textarea = core field).

## Security

- Hand-built iframe (only src/dims/title) — `parseIframeEmbed` scopes extraction; `onload`/`srcdoc`/`name`
  never copied. Proven by `AudioEmbed.spec.tsx:57-67`.
- Hostname allowlist deny-by-default; suffix rule rejects `rsi.ch.evil.com`, `ardmediathek.de.evil.com`
  (`embeds.ts:10`). Broadcasters (SRG SSR, ARD) trustworthy; subdomains not publicly registrable.
- `sandbox="allow-scripts allow-same-origin allow-popups"` — pre-existing weakening already shipped on
  youtube/arte/rts iframes; broadcaster additions change nothing.
- Validator requires `https:`.

## Tests

- **`src/validators/videoFields.spec.ts` (new)** — mirror `audioFields.spec.ts`: empty-url-allowed-when-
  embedCode, both-empty rejected, non-iframe rejected, evil host rejected, `javascript:`/data-src spoof,
  https-only, lookalike host, `width="100%"` parse case.
- **`src/validators/fields.spec.ts` (extend)** — Artists/shared `validateVideoURL` regression: empty+
  embedCode → true; empty+no-embedCode → reject; array-item context unchanged.
- **`src/utils/embeds.spec.ts` (extend)** — `rsi.ch`/`ardmediathek.de` exact + subdomain + lookalike
  (`rsi-ch.com`, `ardmediathek.de.evil.com`).
- **`src/components/blocks/VideoEmbed.spec.tsx` (NEW file — doesn't exist yet)** — mirror
  `AudioEmbed.spec.tsx` incl. iframe mock: embedCode renders iframe (src/width/height/title parsed),
  `width="100%"` handled, fullscreen attrs present, junk attrs discarded, evil host → error box,
  `javascript:` src → error box, both-empty → empty DOM, URL branch + aspectRatio branch regression.

## Docs

- Mark `docs/superpowers/specs/2026-08-27-video-embed-code-admin-allowlist-design.md` as **REJECTED /
  superseded** by this spec (it still says "Draft — pending review" and contains the admin-Global design).

## Rollout / verification

- `pnpm lint`, `pnpm test`, `pnpm build`.
- Manual: admin pastes an RSI embed (`rsi.ch/play/embed?urn=...`) and an ARD Mediathek embed; verify render
  (fullscreen works), save validation, and that an unknown host is rejected.
