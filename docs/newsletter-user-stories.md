# Newsletter Management & Mailjet Integration — User Stories

## 1. Newsletter Content Modeling in Payload

- As a content editor, I want to create and edit newsletter issues in Payload CMS, so I can manage the content of each
  campaign before sending.
- As an admin, I want to define the structure of a newsletter (subject, preheader, body, images, send date, status), so
  all issues are consistent and ready for sending.
- As a developer, I want to store newsletter issues in a dedicated collection, so they are versioned and auditable.

## 2. Newsletter Contacts Management

- As a content manager, I want to view, add, import, and remove newsletter contacts in Payload, so I can keep the
  recipient list up to date.
- As a user, I want to subscribe or unsubscribe from the newsletter via a public form, so I can control my email
  preferences.
- As an admin, I want to see the subscription status and engagement history of each contact, so I can segment and target
  campaigns.
- As a system, when Mailjet notifies us that a contact has unsubscribed, I want to automatically update that contact’s
  status in Payload CMS, so the editorial team never accidentally emails unsubscribed users.

## 3. Editorial Workflow

- As an editor, I want to save newsletter drafts and preview them before sending, so I can ensure quality and accuracy.
- As an admin, I want to approve or schedule newsletters for sending, so only reviewed content is sent to subscribers.
- As a team member, I want to see the status (draft, scheduled, sent) of each newsletter, so I know what’s in the
  pipeline.

## 4. Mailjet Integration

- As an admin, I want to trigger the creation of a Mailjet campaign directly from a newsletter issue in Payload, so I
  can send campaigns without leaving the CMS.
- As a developer, I want to sync newsletter content and contacts from Payload to Mailjet using the Mailjet API, so
  campaigns are always up to date.
- As an admin, I want to see the send status and analytics (delivered, opened, clicked) for each campaign in Payload, so
  I can measure performance.
- As a developer, I want to handle Mailjet API errors gracefully and log them, so issues can be diagnosed and fixed
  quickly.

## 5. Contact Management & Segmentation

- As a content manager, I want to segment contacts by tags, interests, or engagement, so I can send targeted
  newsletters.
- As an admin, I want to sync contact changes (add, remove, update) between Payload and Mailjet, so both systems are
  consistent.

## 6. Admin UI/UX Enhancements

- As an editor, I want a clear dashboard in Payload showing upcoming, sent, and draft newsletters, so I can manage
  campaigns efficiently.
- As an admin, I want to filter and search contacts and newsletters, so I can quickly find what I need.
- As a user, I want confirmation and error messages when performing actions (send, schedule, import), so I know what
  happened.

## 7. Security, Access Control, and Auditing

- As an admin, I want to restrict newsletter and contact management to authorized users, so sensitive data is protected.
- As a developer, I want to log all changes to newsletters and contacts, so actions are auditable.

## 8. Optional Enhancements

- As a marketer, I want to run A/B tests on newsletter content, so I can optimize engagement.
- As an admin, I want to view analytics and reports for each campaign in Payload, so I can track performance over time.
- As a developer, I want to support multi-language newsletters, so I can reach a broader audience.
