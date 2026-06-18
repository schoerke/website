import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath } from 'next/cache'

const LOCALES = ['de', 'en'] as const

// Artists list page paths — one per locale
const ARTIST_LIST_PAGES = LOCALES.map((locale) => `/${locale}/artists`)

// Homepage paths — one per locale
const HOME_PAGES = LOCALES.map((locale) => `/${locale}`)

/**
 * Revalidates the artists list page and homepage for all locales.
 * Called on every artist change/delete since these pages render the full artist list.
 */
function revalidateArtistListAndHome(): void {
  for (const path of [...ARTIST_LIST_PAGES, ...HOME_PAGES]) {
    revalidatePath(path)
  }
}

/**
 * Revalidates the artist detail page for a given slug across all locales.
 * Artist slugs are not localized — same slug for DE and EN.
 */
function revalidateArtistDetail(slug: string): void {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/artists/${slug}`)
  }
}

/**
 * afterChange hook: revalidates artist list, homepage, and detail page when an artist changes.
 */
export const revalidateArtistOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistListAndHome()

  if (doc.slug) {
    revalidateArtistDetail(doc.slug)
  }

  console.log(`[revalidate] Artist pages revalidated after change (id: ${doc.id}, slug: ${doc.slug})`)
  return doc
}

/**
 * afterDelete hook: revalidates artist list, homepage, and detail page when an artist is deleted.
 */
export const revalidateArtistOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc

  revalidateArtistListAndHome()

  if (doc.slug) {
    revalidateArtistDetail(doc.slug)
  }

  console.log(`[revalidate] Artist pages revalidated after delete (id: ${doc.id}, slug: ${doc.slug})`)
  return doc
}
