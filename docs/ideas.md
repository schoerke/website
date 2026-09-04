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

## UI: Blocks (v2)

### WorksList

- displays the program for a concert, including composers, works, performers, and program pauses
- should also support optional program title
- **TODO (user will apply later):** WorksList prototype (`src/app/(frontend)/works-list-prototype/page.tsx`, branch
  `feat/works-list`) — add brand-yellow rule before the block's optional title, matching the PerformersList
  prototype's title treatment (yellow `bg-primary-yellow h-0.5 w-6` bar + semibold/bold heading). Change is
  already applied and stashed: `git stash list` → "works-list-prototype yellow title bar (apply later)" on
  `feat/works-list`. Pop it there (`git stash pop`), keep the edit, review at `/works-list-prototype`.

### PerformersList

- displays a list of performers for a concert, including names and instruments
- should also support optional title

## UI: Utils

- "Format Text" formats text for display in the UI, including line breaks, links, and other formatting options
- "Convert to WorksList" converts a block of text into a work object, extracting relevant information such as composer, title, and opus number
- "Convert to PerformersList" converts a block of text into a performer object, extracting relevant information such as name and instrument

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
