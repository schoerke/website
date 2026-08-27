import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

// All pages that render employee data
const EMPLOYEE_PAGES = ['/de/contact', '/en/contact', '/de/kontakt', '/en/kontakt']

/**
 * Revalidates all contact pages and the artists subtree after an employee record changes.
 * Employees appear on the contact/kontakt pages for both locales AND as contactPersons on
 * artist detail pages (now statically rendered — stale without this purge).
 */
function revalidateEmployeePages(): void {
  for (const path of EMPLOYEE_PAGES) {
    revalidatePath(path)
  }
  revalidatePath('/(frontend)/[locale]/artists', 'layout')
}

/**
 * afterChange hook: revalidates contact pages when an employee is created or updated.
 */
export const revalidateEmployeeOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateEmployeePages()
  console.log(`[revalidate] Contact pages revalidated after employee change (id: ${doc.id})`)
  return doc
}

/**
 * afterDelete hook: revalidates contact pages when an employee is deleted.
 */
export const revalidateEmployeeOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateEmployeePages()
  console.log(`[revalidate] Contact pages revalidated after employee delete (id: ${doc.id})`)
  return doc
}
