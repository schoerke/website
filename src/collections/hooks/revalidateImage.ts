import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Purges every localized frontend page after an image change/delete.
 *
 * Images render on cached pages across the whole site (home slider + artist grid,
 * artist detail, post detail, team cards, contact page, discography). Image edits
 * re-upload the blob under the SAME filename/URL and bump updatedAt; without a
 * purge, cached pages keep serving the old URL/focal point. RevalidatePath with
 * type 'layout' invalidates the [locale] layout AND every page beneath it.
 */
function revalidateFrontend(): void {
  // Must include the (frontend) route group — revalidatePath matches file structure, not URL
  revalidatePath('/(frontend)/[locale]', 'layout')
}

/**
 * afterChange hook: purges cached frontend pages when an image is created or edited
 * (crop, focal point, alt, credit). Skips draft-only and script-driven saves via
 * the shared skipRevalidation context flag.
 */
export const revalidateImageOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) {
    return doc
  }

  revalidateFrontend()
  console.log(`[revalidate] Frontend pages revalidated after image change (id: ${doc.id})`)
  return doc
}

/**
 * afterDelete hook: purges cached frontend pages when an image is deleted so no
 * page references a removed blob URL.
 */
export const revalidateImageOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) {
    return doc
  }

  revalidateFrontend()
  console.log(`[revalidate] Frontend pages revalidated after image delete (id: ${doc.id})`)
  return doc
}
