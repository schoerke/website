# ADR: Adoption of next-intl for Internationalization

- **Date:** 2025-11-16
- **Status:** Accepted

## Context

The project requires robust, maintainable, and SEO-friendly internationalization (i18n) for both static and dynamic
content. The Next.js App Router’s built-in i18n is not flexible enough for fully localized URLs and dynamic segments.
The team evaluated several options, including built-in Next.js i18n, custom middleware, and third-party libraries.

## Decision

We will use [next-intl](https://amannn.github.io/next-intl/) as the primary i18n solution for the following reasons:

- **Fully Localized URLs:** next-intl allows mapping any internal route to any external, locale-specific URL (e.g.,
  `/kuenstler` for German, `/en/artists` for English).
- **Dynamic Segments:** Supports dynamic segments and CMS-driven slugs per locale.
- **Centralized Routing Config:** All localized pathnames are defined in a single TypeScript config file.
- **Middleware Integration:** Handles locale negotiation, redirects, and rewrites via middleware.
- **Navigation Helpers:** Provides locale-aware `Link`, `usePathname`, and other navigation utilities.
- **SEO:** Enables correct generation of alternate links and canonical URLs for all locales.
- **No React Context Required:** Locale is handled at the routing/middleware level, not via global React state.
- **Efficient Integration with Payload CMS:** Only one API call is needed to fetch all localized slugs for dynamic
  content.

## Consequences

- All routing and navigation must use next-intl’s helpers and config.
- All new routes and locales must be added to the central routing config.
- The language switcher and navigation components must use next-intl’s APIs.
- Documentation and onboarding must reflect the next-intl-based workflow.
- Future changes to i18n requirements can be managed centrally in the routing config and middleware.

## Alternatives Considered

- **Next.js built-in i18n:** Not flexible enough for fully localized URLs or dynamic segments.
- **Custom middleware only:** More complex, less maintainable, and lacks navigation helpers.
- **Other i18n libraries:** next-intl is the most mature and best-documented for Next.js App Router.

## References

- [next-intl Documentation](https://amannn.github.io/next-intl/)
- [Project i18n Design Doc](../plans/2025-11-16-i18n-design.md)
- [Payload CMS Localization](https://payloadcms.com/docs/localization/overview)
- [Next.js App Router Internationalization](https://nextjs.org/docs/app/guides/internationalization)
