# Ideas for Future Features

## Idea: Scheduled Publishing (v2)

- allow content creators to schedule posts, events, and media for future publication
- add a calendar view in the admin panel to manage scheduled content

## Idea: Media Naming Convention

- photos should follow strict naming convention
- content creators add credit and identifier
- Payload enforces/generates name on creation

## Idea: PDF Generation

- artist biographies

## Idea: Newsletter Management (v2)

- manage contacts via Mailjet API
- manage campaigns via Mailjet API
- preview campaigns in-app before sending
- schedule campaigns for future sending
- track campaign performance metrics (open rates, click rates, etc.)

## UI: Enhancements

- global navigation on mobile/desktop

### BiographyFooter

- replaces the existing biography footer text with structured artist fields

## UI: Blocks (v2)

### DatesList — ✅ Implemented 2026-08-28

- displays a list of upcoming concerts with date and location
- → `eventDates` block: `src/blocks/EventDates.ts` + `src/components/blocks/EventDates.tsx`
- spec: `docs/superpowers/specs/2026-08-28-eventdates-block-design.md`

### ConcertProgram

- displays the program for a concert, including composers, works, performers, and program pauses
- should also support optional program title

## Idea: Sentry Error Monitoring

- monitor errors for Schoerke site using existing Sentry account (own website already monitored)
- separate Sentry project per site, own DSN per project
- add `SENTRY_DSN` env var to Vercel project (Member role can add env vars)
- free Developer plan: 5K errors/month per org, 1 user, email alerts
- complementary to free Vercel deploy notifications

## Docs

- generate a change log from git commits

## Musical Composition Metadata

- add metadata for musical compositions, including composer, title, opus number, key
- useful for concert programs

## Shortcodes for Content Management

- composer names

## UI: admin

- auto-suggest for post titles (show used titles)
