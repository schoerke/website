# Audio Embed Generic Iframe Support Design

**Date:** 2026-08-18

**Status:** Approved

## Goal

Let editors embed audio from providers that ship a raw `<iframe>` embed snippet
(RTS as first consumer) by pasting the snippet into the Audio Embed block — without
new per-platform parsers. The `url` field keeps supporting Spotify / Apple Music
native embeds.

## Context

- `AudioEmbed` block: `src/blocks/AudioEmbed.ts` — fields: `url` (required,
  validated by `validateAudioURL` in `src/validators/audioFields.ts`).
- Renderer: `src/components/blocks/AudioEmbed.tsx` (client) → sync
  `getAudioEmbedData` (`src/utils/audioEmbed.ts`) builds Spotify/Apple embed URLs →
  iframe. Height from `getAudioEmbedHeight`.
- Rich text wiring: `src/components/ui/PayloadRichText.tsx` passes `url` to
  `<AudioEmbed>` (line 89-92).
- **No schema/migration impact**: `AudioEmbed` is used only via `BlocksFeature`
  (Lexical rich text) in `src/collections/Posts.ts:119` and
  `src/collections/Repertoire.ts:127`. Block nodes serialize to JSON inside the
  existing `content` column. No `type: 'blocks'` field anywhere, no dedicated block
  tables. Adding a field is a pure config change.
- RTS embed (verified): `https://www.rts.ch/play/embed?urn=urn:rts:audio:<oid>`
  serves `frame-ancestors *` (embeddable) and returns 200. Standard snippet is
  `392x58`. Article-URL ids (`-26132153.html`) differ from media oids; the snippet
  form sidesteps that — no server-side resolution needed.

## Design

### Block fields — `src/blocks/AudioEmbed.ts`

- Keep `url` (existing behavior for Spotify / Apple Music).
- Add optional `embedCode` textarea:
  - `admin.condition`: show when `url` is empty.
  - `validate: validateEmbedCode` (`src/validators/audioFields.ts`).
  - Label (de/en): `Einbettungscode` / `Embed Code`.
  - Admin placeholder shows an example RTS snippet.
- `url` becomes non-required. Both `url` and `embedCode` are optional at field
  level; a `validate` on each field enforces the invariant: `url` returns
  "enter a URL or an embed code" when *both* are empty (checked against the
  other field's value via the full data in `validate({ value, data, siblingData })`).

### Allowlist — `src/utils/embeds.ts`

```ts
export const ALLOWED_EMBED_HOSTS = ['rts.ch']
```

- Exact-host + explicit-subdomain match only; no wildcard domains.
- **Deny by default**: any host not listed is rejected.
- Adding a provider (NDR, Vimeo, SoundCloud, SRF…) = one array entry, no code
  beyond it.

### Validator — `src/validators/audioFields.ts`

`validateEmbedCode(value): true | string`

1. Reject non-string / empty.
2. Must contain `<iframe`.
3. Extract `src` via regex; must be `https://` URL.
4. `hostname` must match an allowlisted host (exact or `*.host`).
5. Otherwise return localized error message.

`validateAudioURL` unchanged for Spotify/Apple (plus the both-empty check above).

### Parser — `src/utils/audioEmbed.ts`

```ts
interface ParsedIframe {
  src: string
  width?: number
  height?: number
  title?: string
}
function parseIframeEmbed(code: string): ParsedIframe | null
```

Regex-extracts `src`, `width`, `height`, `title`. No DOM (runs in validator context
too, but used client-side). Rejects snippet with no `src`.

### Renderer — `src/components/blocks/AudioEmbed.tsx`

- When `embedCode` present: `parseIframeEmbed(code)`; on failure render the existing
  red error box.
- Render iframe with **only** extracted safe attributes, our own hardened
  `sandbox`/`allow`:

```tsx
<iframe
  src={parsed.src}
  width="100%"
  height={parsed.height ?? 58}
  title={parsed.title ?? 'Audio player'}
  sandbox="allow-scripts allow-same-origin allow-popups"
  allow="autoplay; encrypted-media"
  loading="lazy"
/>
```

- **Never `dangerouslySetInnerHTML`.** Junk attributes (`onload=`, `srcdoc=`,
  `style=`, event handlers) are ignored by construction — we rebuild the element
  from a fixed prop set.
- Snippet's own `allow`/`allowfullscreen` attributes are dropped; hardened values
  used instead.

### Rich text wiring — `src/components/ui/PayloadRichText.tsx`

Pass `embedCode` to `<AudioEmbed>` alongside `url` (line 89-92).

### Error handling

- Invalid embedCode (validation fail at save time) → admin-side block error.
- Valid-at-save but unparsable (provider changed snippet) → red error box at
  render, same as existing invalid-URL path.

### Testing

- `src/utils/audioEmbed.spec.ts`:
  - `parseIframeEmbed` parses valid RTS snippet (`src`, `width`, `height`, `title`).
  - Rejects missing `src`, garbage input.
  - Ignores XSS attempt (`onload=`, `srcdoc=`, inline `style=`) — output has none.
- `src/validators/audioFields.spec.ts`:
  - Accepts RTS snippet (`rts.ch`).
  - Rejects non-allowlisted host (e.g. `evil.example.com`, `not-rts-ch.com`).
  - Rejects non-iframe text, missing `src`, non-https src.
  - Rejects both-empty (url + embedCode) — covered by block validator combination.
- **No database changes.** No migration, no `payload-generated-schema.ts` diff, no
  data modification. No new dependencies.

## Files touched

- `src/blocks/AudioEmbed.ts`
- `src/utils/embeds.ts` (new)
- `src/utils/audioEmbed.ts`
- `src/validators/audioFields.ts`
- `src/components/blocks/AudioEmbed.tsx`
- `src/components/ui/PayloadRichText.tsx`
- Tests: `src/utils/audioEmbed.spec.ts`, `src/validators/audioFields.spec.ts`

## Out of scope

- NDR video embed (original request) — revisit after this; NDR's `~player.html`
  iframe can reuse the same embedCode + allowlist path (add `ndr.de` to
  `ALLOWED_EMBED_HOSTS`).
- Server-side oid resolution for RTS article URLs (not needed — snippet form).
- CMS-managed / env-var allowlist (keep list in code).
- Changes to `VideoEmbed` block.
