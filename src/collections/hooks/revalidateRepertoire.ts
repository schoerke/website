import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * Revalidates the statically-rendered artist detail pages when a repertoire document changes.
 * Artist pages render repertoire title/content server-side (RepertoireTab), and an edit that
 * doesn't touch the artists array never fires syncArtistRepertoire's artist write — so without
 * this hook the static pages serve stale repertoire.
 */
function revalidateArtistSubtree(): void {
  revalidatePath('/(frontend)/[locale]/artists', 'layout')
}

/**
 * afterChange hook: purges the artists subtree when a repertoire document is created or updated.
 */
export const revalidateRepertoireOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistSubtree()
  console.log(`[revalidate] Artist pages revalidated after repertoire change (id: ${doc.id})`)
  return doc
}

/**
 * afterDelete hook: purges the artists subtree when a repertoire document is deleted.
 */
export const revalidateRepertoireOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistSubtree()
  console.log(`[revalidate] Artist pages revalidated after repertoire delete (id: ${doc.id})`)
  return doc
}
