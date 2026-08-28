# BiographyFooter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a derived, two-line BiographyFooter below each non-empty artist biography.

**Architecture:** Add one localized `quoteSource` Artists field. Server artist page derives Sept–Aug season and passes it through client tabs. Footer derives photo credit from populated featured image and consent from next-intl. Legacy text cleanup is manual before deployment.

**Tech Stack:** Payload 3, SQLite migrations, Next.js ISR, next-intl, React, Vitest.

---

### Task 1: Season helper
**Files:** Create `src/utils/season.ts`, `src/utils/season.spec.ts`

- [ ] Write failing tests for Aug 31 2026 → `2025/2026`, Sep 1 2026 → `2026/2027`, Dec 31 2026 → `2026/2027`, Jan 1 2026 → `2025/2026`.
- [ ] Run `pnpm vitest run src/utils/season.spec.ts`; expect fail.
- [ ] Implement:
```ts
export function getConcertSeason(date: Date): string {
  const year = date.getFullYear()
  return date.getMonth() >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}
```
- [ ] Run test; expect pass. Commit `feat(artists): add concert season helper`.

### Task 2: Artist field and migration
**Files:** Modify `src/collections/Artists.ts`; create migration; generate `src/payload-types.ts`, `src/payload-generated-schema.ts`

- [ ] Add below localized `quote` in Biographie tab:
```ts
{ name: 'quoteSource', type: 'text', localized: true, required: false, label: { de: 'Zitatquelle', en: 'Quote source' } }
```
- [ ] Run `pnpm payload generate:types` and `pnpm payload generate:db-schema`.
- [ ] Run `pnpm payload migrate:create add-artist-quote-source`; make up/down idempotent with `pragma_table_info('artists_locales')`. Up adds nullable `quote_source text`; down removes it safely per generated migration.
- [ ] Do not run or accept any migration/schema push. Approval required.
- [ ] Run `pnpm exec tsc --noEmit`. Commit `feat(artists): add localized quote source field`.

### Task 3: Fetch field
**Files:** Modify `src/services/artist.ts`, `src/services/artist.spec.ts`

- [ ] Update `ARTIST_SELECT` test with `quoteSource: true` after `quote`; run `pnpm vitest run src/services/artist.spec.ts`; expect fail.
- [ ] Add `quoteSource: true` after `quote: true` in `getArtistBySlug` select.
- [ ] Add tests that query options retain `fallbackLocale: 'de'`, and returned EN source is retained.
- [ ] Run test; expect pass. Commit `feat(artists): select quote source for detail pages`.

### Task 4: Footer component and translations
**Files:** Create `src/components/Artist/BiographyFooter.tsx`, `.spec.tsx`; modify `src/i18n/de.ts`, `src/i18n/en.ts`

- [ ] Add `custom.pages.artist.biographyFooter`: `season`, `photo`, `consent` in both locales.
- [ ] Write failing happy-dom tests: localized labels; `[season, photo, quoteSource].filter(Boolean).join(' • ')`; one detail has no separator; credit/source trim; omit ID/null/undefined/blank image; consent always renders.
- [ ] Implement component props `{ season: string; quoteSource?: string | null; image?: Artist['image'] }`. Use `isImageObject`, trim credit/source, `<footer>` with two `<p className="font-bold text-sm">` lines.
- [ ] Run component test; expect pass. Commit `feat(artists): add derived BiographyFooter`.

### Task 5: Wire page and biography
**Files:** Modify `src/app/(frontend)/[locale]/artists/[slug]/page.tsx`, `src/components/Artist/ArtistTabs.tsx`, `src/components/Artist/ArtistTabContent.tsx`; update their specs.

- [ ] Write failing tests: page exports `revalidate === 86400`; tabs forwards season/quoteSource/image; null, empty-root, and no-text bio render neither rich text nor footer.
- [ ] Add `export const revalidate = 86400`; compute `const season = getConcertSeason(new Date())`; pass season to ArtistTabs.
- [ ] Pass `season`, `artist.quoteSource`, `artist.image` to BiographyTab.
- [ ] In BiographyTab, guard with existing `hasVisibleTextContent(content)`; otherwise render quote, PayloadRichText, BiographyFooter.
- [ ] Run relevant specs; expect pass. Commit `feat(artists): render BiographyFooter on artist pages`.

### Task 6: Verify and rollout
- [ ] Run `pnpm test`, `pnpm lint`, `pnpm build`.
- [ ] Obtain explicit approval before migration. Review/preflight migration snapshot, then apply only approved DB.
- [ ] Before deployment, manually remove legacy footer paragraphs from every affected localized bio; enter quoteSource where present; verify one derived footer only.
- [ ] Confirm ISR refreshes season within 24 hours of Sep 1.
