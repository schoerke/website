import type { FieldHook } from 'payload'

/**
 * Defaults and guards Posts.publishedDate on every write.
 *
 * Payload semantics relied upon (verified against Payload 3.89):
 * - `createdAt` is injected by the DB adapter AFTER field hooks run on create, so
 *   `siblingData.createdAt` is undefined in create-path field hooks.
 * - Update hooks receive the incoming patch only (no merge with the stored doc);
 *   absence (`undefined`) must be treated as "no change", not "clear".
 * - Version restore runs hooks with `operation: 'update'` and
 *   `req.context.isRestoringVersion` set; the patch is the historical version
 *   (pre-field versions lack `publishedDate`). Restore delivers an explicit `null`
 *   for a legacy version's NULL `version_published_date` (not `undefined`), so the
 *   restore-preserve branch must run BEFORE the explicit-clear branch.
 *
 * @param args - Payload field hook args
 * @returns The value to store, or undefined to leave the stored value untouched
 *
 * @example
 * hooks: { beforeChange: [setPublishedDate] }
 */
export const setPublishedDate: FieldHook = ({ value, siblingData, operation, originalDoc, req }) => {
  if (value !== null && value !== undefined) return value

  if (value === null && req?.context?.isRestoringVersion) {
    // Restoring a legacy version delivers `value: null` (its version_published_date column is
    // NULL). Preserve the current backdate instead of resetting to createdAt.
    return originalDoc?.publishedDate ?? originalDoc?.createdAt ?? siblingData?.createdAt ?? new Date().toISOString()
  }

  if (value === null) {
    // Explicit admin clear. originalDoc carries the stored createdAt; the update
    // patch (siblingData) does not.
    return originalDoc?.createdAt ?? siblingData?.createdAt ?? new Date().toISOString()
  }

  if (operation === 'create') {
    // Defensive only: createdAt is normally injected by the DB adapter AFTER field hooks run,
    // so siblingData.createdAt is absent on the regular create path and we fall back to now.
    // It is present only when an API client explicitly supplies createdAt in the payload.
    return siblingData?.createdAt ?? new Date().toISOString()
  }

  // Defensive only: restore's findVersions reads the full row (no select), so a legacy version's
  // NULL version_published_date arrives as `value: null` (handled above), never undefined. Kept as
  // a guard in case a future Payload change delivers undefined on restore.
  if (req?.context?.isRestoringVersion && originalDoc?.publishedDate) return originalDoc.publishedDate

  return undefined
}
