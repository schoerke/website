import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Revalidates the home page for all locales.
 * Must be called with explicit paths — revalidatePath does not expand route parameters.
 */
function revalidateHomePage(): void {
  // Must include the (frontend) route group — revalidatePath matches file structure, not URL
  revalidatePath('/(frontend)/[locale]', 'page')
}

/**
 * Revalidates the home page after a post is published or unpublished.
 * Skips draft-only saves (including autosave) to avoid continuous cache busting.
 */
export const revalidateHomePageOnPostChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const isPublished = doc._status === 'published'
  const wasPublished = previousDoc?._status === 'published'

  if (!isPublished && !wasPublished) {
    return doc
  }

  revalidateHomePage()
  console.log(`[revalidate] Home page revalidated after post change (id: ${doc.id}, status: ${doc._status})`)
  return doc
}

/**
 * Revalidates the home page after a published post is deleted.
 * Skips revalidation if the deleted post was only a draft.
 */
export const revalidateHomePageOnPostDelete: CollectionAfterDeleteHook = ({ doc }) => {
  if (doc._status !== 'published') {
    return doc
  }

  revalidateHomePage()
  console.log(`[revalidate] Home page revalidated after post delete (id: ${doc.id})`)
  return doc
}

/**
 * Revalidates the home page after the HomePage global is updated.
 */
export const revalidateHomePageOnGlobalChange: GlobalAfterChangeHook = ({ doc }) => {
  revalidateHomePage()
  console.log('[revalidate] Home page revalidated after HomePage global change')
  return doc
}
