# Robots and Sitemap Design

## Goal

Expose a crawl policy and a current XML sitemap for public German and English pages.

## Routes

- Add `src/app/robots.ts`, served as `/robots.txt`.
- Permit public crawling.
- Exclude `/admin`, `/admin/`, `/api`, `/api/`, `/de/preview/`, and `/en/preview/`.
- Reference `/sitemap.xml`.
- Add `src/app/sitemap.ts`, served as `/sitemap.xml`.

## Sitemap Entries

- Use one shared, normalized `NEXT_PUBLIC_SITE_URL` value for robots and sitemap URLs. It must be an absolute HTTPS origin without a trailing slash; fall back to `https://ks-schoerke.de`; fail generation for an invalid configured value.
- List `/de` and `/en` home, artists, news, and projects URLs.
- List mapped legal and contact URLs: `/de/kontakt`, `/en/contact`, `/de/impressum`, `/en/imprint`, `/de/datenschutz`, `/en/privacy-policy`.
- Exclude `/team`, which redirects to contact.
- List both locale variants of every valid artist. Artists have no draft status.
- List both locale variants of published news and project posts. Query each category separately.
- Omit a locale-specific dynamic URL when its localized slug is absent or invalid. Do not use a fallback slug.
- Add `lastModified` from a valid dynamic document `updatedAt`; omit it when the value is invalid. Omit it from static URLs.
- Add locale alternate links to each dynamic sitemap entry.
- Exclude admin, API, preview, search, pagination, drafts, recordings, repertoire, and media URLs.

## Data and Cache Flow

- `sitemap.ts` reads content through Payload's Local API with `depth: 0` and a slim selection of slug, `updatedAt`, and category fields.
- Artist queries use normal public access. Post queries explicitly filter `_status: published` and category.
- The metadata route caches indefinitely. Artist and post hooks add `revalidatePath('/sitemap.xml')` for visible creates, updates, publishes, unpublishes, and deletions. `revalidatePath` makes the route stale for its next request, which rebuilds the sitemap from current content. Crawlers may retain prior sitemap contents longer.
- `skipRevalidation` is an explicit exception for trusted scripts and bulk operations. A caller that uses it must trigger sitemap revalidation independently or accept sitemap staleness until deployment or cache eviction.
- Static sitemap entries need no revalidation.
- If Payload cannot provide dynamic entries, sitemap generation fails visibly rather than silently publishing an incomplete sitemap.
- Legal pages remain fixed sitemap entries. Missing CMS content may make a legal URL return 404; adding page-presence filtering and page hook invalidation is out of scope for this work.
- The fixed legal URL behavior is accepted temporary SEO debt. Verify their canonical HTTP responses during deployment checks.

## Verification

- Unit test robots policy and sitemap output with mocked Payload data.
- Serialize and parse generated XML. Assert unique absolute URLs, valid timestamps, mapped static paths, no redirect or forbidden URLs, valid configured-host handling in robots and sitemap, locale alternates, missing-localization omission, artist inclusion, category-filtered published posts, draft exclusion, Payload failure propagation, and sitemap revalidation calls for change and delete paths.
- Run `pnpm lint`, `pnpm typecheck`, affected tests, and `pnpm exec oxfmt --check src/app/robots.ts src/app/sitemap.ts`.
