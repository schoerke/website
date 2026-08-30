# Image Credit Cleanup Design

## Goal

Remove a leading `(c)` marker and whitespace following it from `images.credit`. The website already renders `©` for
gallery captions, so stored markers duplicate the copyright symbol.

## Scope

- Target only the Payload `images` collection's `credit` field.
- Match a leading `(c)` case-insensitively, followed by zero or more whitespace characters.
- Preserve all remaining credit text unchanged.
- Normalize marker-only values to `null` rather than storing an empty credit.
- Leave credits without that leading marker unchanged.
- Do not alter image files, alt text, relationships, or other collections.

Examples:

| Stored credit | Result |
| --- | --- |
| `(c) Jane Doe` | `Jane Doe` |
| `(C)Jane Doe` | `Jane Doe` |
| `(c) ` | `null` |
| `  (c) Jane Doe` | unchanged |
| `© Jane Doe` | unchanged |
| `Jane Doe (c)` | unchanged |

## Implementation

Create a pure normalizer in `src/utils/` with Vitest coverage, then reuse it from a permanent
`scripts/db/cleanImageCredits.ts` script. The script initializes Payload through the Local API and:

1. Queries all images with `where: { credit: { exists: true } }`, `depth: 0`, `pagination: false`, and `limit: 0`.
   The normalizer then excludes `null`, empty, whitespace-only, and already-normalized credits in memory.
2. Computes the normalized value in memory and creates a manifest containing each image ID, filename, old credit, and
   new credit, plus a canonical SHA-256 digest of those ordered entries.
3. Dry-run prints each manifest entry and count summary, then writes the manifest JSON to an explicitly supplied path.
4. `--apply` requires `--manifest <path>` and validates its format and digest before connecting.
5. Re-queries and compares the current manifest against the supplied manifest before the first write; any difference
   aborts with zero writes.
6. For each manifest entry, re-read the image immediately before update and verify its current credit equals the
   manifest's old credit. Abort before that entry if it differs, never overwrite a concurrent edit.
7. Writes only the normalized `credit` value, using `context: { skipRevalidation: true }`.
8. Stops on the first failed update and reports completed IDs plus the failing entry. Recovery is a new dry-run and
   reviewed manifest; never reuse a manifest after a partial run.
9. Guards production execution: production URI requires `NODE_ENV=production`.

The default is read-only dry-run. No raw SQL or direct libSQL writes.

Add an admin `CreditField` component, mirroring `QuoteField`. It uses the shared normalizer predicate to show a
localized, non-blocking warning whenever a credit begins with `(c)` or `(C)`. Configure it as the `credit` field's
admin `Field` component. Existing saved values remain valid; the warning prevents repeat formatting mistakes without
blocking intentional input. Mirror `QuoteField`'s warning class and reserved hidden-space layout, then regenerate
`src/app/(payload)/admin/importMap.js`.

Add a fixed-purpose `POST` revalidation route. It accepts no cache path or arbitrary payload, requires an authenticated
Payload admin session, and revalidates only `/(frontend)/[locale]` with type `layout`. Reject unauthenticated,
unauthorized, malformed, and non-POST requests. The route is used once after a successful cleanup run; it is not part
of the image update loop.

## Execution

1. Confirm `.env` targets local `file:./dev.db`.
2. Run local dry-run with an explicit manifest path; review all proposed changes and its digest.
3. Run local `--apply --manifest <path>`, then repeat dry-run to confirm zero matches.
4. Trigger frontend revalidation through an authenticated server-context endpoint after local changes; verify a
   rendered image caption no longer duplicates the copyright mark.
5. Download and integrity-check the nightly R2 production snapshot using `docs/memory/checklists.md` section 1.
6. Confirm production target with the user, inspect only `DATABASE_URI`, and use the existing `.env`
   `DATABASE_AUTH_TOKEN` with the inline production URI and `NODE_ENV=production`, following
   `docs/memory/checklists.md` section 5. Extract the token into a shell variable; never print it. Never create a token.
7. Run production dry-run with an explicit manifest path; review its entries, count, and digest.
8. Obtain explicit final approval naming production and the exact manifest count.
9. Run production `--apply --manifest <path>`; repeat dry-run to confirm zero matches.
10. Trigger authenticated frontend revalidation; verify a production rendered caption.

## Error Handling

- Invalid arguments exit nonzero without writes.
- Script exits nonzero if Payload initialization or an update fails.
- Per-document output makes each intended or completed change auditable.
- Manifest differences between review and apply abort before updates. Per-image revalidation prevents concurrent edits
  from being overwritten between preflight and update.
- A partial run must be followed by a new dry-run and review; its old manifest is invalid.
- A production run without `NODE_ENV=production` aborts before connecting.

## Verification

- Unit tests cover marker matching, case handling, whitespace behavior, marker-only normalization, and no-op inputs.
- Component tests cover visible German and English admin warnings and unmarked credits.
- Script tests cover invalid arguments, manifest serialization/digest validation, production guard, dry-run no-write,
  unpaginated query, preflight manifest drift, per-image drift, and update failures.
- Add a disposable local SQLite/Payload integration test for dry-run, normalized updates, `null` marker-only result,
  skipped image revalidation context, and drift abort before the first write.
- Revalidation route tests cover method, unauthenticated, unauthorized, malformed request rejection, and the exact
  localized frontend-layout `revalidatePath` call.
- Run targeted tests, `pnpm lint`, and `pnpm typecheck`.
- Verify local and production post-apply dry-runs report zero matches and rendered captions update after revalidation.
