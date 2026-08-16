# Posts `createdBy` auto-selection for employee users

**Date:** 2026-08-16
**Status:** Approved
**Scope:** `src/collections/Posts.ts` — `createdBy` field only.

## Problem

When creating a new post, "Created by" defaults to `defaultValue: 1`, which is employee
**Tina Nurnus** (the inline comment claims "Eva Wagner" — wrong; employee id 1 is Tina Nurnus).
The requirement: the currently logged-in user should be credited as `createdBy` — but only
when they are actually an employee. Non-employees (e.g., the site developer) must **not** get
an auto-selected author.

## Verified data (dev DB)

- Users (auth) and Employees share a common `email`.
- Email correlation is 1:1 for all current employee users:
  - Tina Nurnus (user id 3) ↔ employee id 1
  - Veronika Fischer (user id 4) ↔ employee id 2
  - Justine Stemmelin (user id 5) ↔ employee id 3
  - Eva Wagner (user id 2) ↔ employee id 4
- Employee "Yuki" (id 5) has no user account — irrelevant.
- Scott Voyles (user id 1, `zeitchef@gmail.com`) is **not** an employee — must not auto-select.

## Decision

Use an **async `defaultValue` function** on the `createdBy` relationship field. Payload
supports async `defaultValue` receiving `{ req, user }` (confirmed via Payload docs +
multi-tenant plugin source). `req.payload.find` (Local API, read-only) resolves the employee
by matching `req.user.email` to `employees.email`.

## Implementation

In `src/collections/Posts.ts`, replace `defaultValue: 1` on `createdBy` with a field-level
`beforeValidate` hook. A `defaultValue` was initially chosen, but Payload's `afterRead`
re-applies `defaultValue` on **every read** of a doc whose field value is undefined,
injecting the _viewer's_ employee as author (verified `afterRead/promise.js`). A
`beforeValidate` hook gated to `operation === 'create'` avoids that read-injection.

```typescript
{
  name: 'createdBy',
  label: { de: 'Erstellt von', en: 'Created by' },
  type: 'relationship',
  relationTo: 'employees',
  required: true,
  admin: {
    position: 'sidebar',
    description: {
      de: 'Automatisch gesetzt, wenn als Mitarbeiter angemeldet.',
      en: 'Auto-set when logged in as an employee.',
    },
  },
  hooks: {
    beforeValidate: [
      async ({ operation, req, siblingData }) => {
        if (operation !== 'create' || siblingData.createdBy) return undefined
        return resolveDefaultCreatedBy({ req })
      },
    ],
  },
},
```

The resolver is a named, testable export `resolveDefaultCreatedBy` in
`src/utils/posts/resolveDefaultCreatedBy.ts` so it can be unit-tested without a full Payload
instance.

## Behavior

- **Employee logged in** → on create, `createdBy` set to their employee record. Applies to
  both admin UI and API/Local creates (`beforeValidate` runs on the create operation).
  Note: the field is **not pre-filled** in the admin create form (hooks run on save); it is
  populated when the document is saved.
- **Non-employee logged in** → resolver returns `undefined`; field empty. `required: true`
  forces a manual selection before save. No more Tina Nurnus auto-credit.
- **Edits** → unaffected. The hook only acts on `operation === 'create'`.
- **No match / missing email** → `undefined` (graceful degradation to manual selection).

## Non-goals

- No schema change, no migration, no DB writes.
- No explicit User↔Employee link field (rejected: 4 employees, emails already match; DB
  migration not warranted).
- No changes to other collections (`createdBy` only exists on posts).
- No change to `required` semantics.

## Testing

Unit test `resolveDefaultCreatedBy`:

- Employee email → returns employee id.
- Non-employee email → returns `undefined`.
- Missing/`undefined` email → returns `undefined`.
- No matching employee → returns `undefined`.

Mock `req.payload.find` / `req.user` — no Payload instance, no DB.

## References

- Payload docs: field `defaultValue` function receives `user`, `locale`, `req`.
- `docs/patterns/payload.md`, `AGENTS.md` DB policy (read-only Local API is allowed without approval).
