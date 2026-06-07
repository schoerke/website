import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'
import { revalidatePath } from 'next/cache'
import type { Post } from '@/payload-types'

const LOCALES = ['de', 'en'] as const

// Keep in sync with categoryOptions in src/data/options.ts
// Only include categories that have a /(frontend)/[locale]/[category]/[slug] route
const CATEGORY_PATHS: Record<string, string> = {
  news: 'news',
  projects: 'projects',
}

/**
 * Resolves the localized slug for a post by fetching it from the database.
 * async: requires DB lookup to resolve localized slugs.
 */
async function getSlugForLocale(id: number, locale: 'de' | 'en', req: PayloadRequest): Promise<string | null> {
  try {
    const doc = await req.payload.findByID({
      collection: 'posts',
      id,
      locale,
      depth: 0,
      overrideAccess: true,
    })
    return doc?.slug ?? null
  } catch {
    return null
  }
}

/**
 * Revalidates all locale-specific paths for a post across every relevant category.
 * Fetches slugs for all locales in parallel and deduplicates identical slugs.
 * Called from afterChange hooks only — afterDelete uses doc.slug directly.
 */
async function revalidatePostPaths(id: number, categories: string[], req: PayloadRequest): Promise<void> {
  const relevantCategories = categories.filter((c) => CATEGORY_PATHS[c])
  if (relevantCategories.length === 0) return

  // Fetch localized slugs in parallel — slugs may differ between DE and EN
  const slugs = await Promise.all(LOCALES.map((locale) => getSlugForLocale(id, locale, req)))

  // Deduplicate in case slugs are identical across locales
  const uniqueSlugs = [...new Set(slugs.filter((s): s is string => s !== null))]

  for (const slug of uniqueSlugs) {
    for (const category of relevantCategories) {
      // [locale] is a route segment wildcard — invalidates all locales for this slug
      const path = `/(frontend)/[locale]/${CATEGORY_PATHS[category]}/${slug}`
      revalidatePath(path, 'page')
      console.log(`[revalidate] Post path revalidated: ${path} (id: ${id})`)
    }
  }
}

/**
 * afterChange hook: revalidates post detail pages after a post is saved.
 * Skips draft-only saves (including autosave) to avoid continuous cache busting.
 * Unions current and previous categories to purge stale URLs on category change.
 */
export const revalidatePostOnChange: CollectionAfterChangeHook<Post> = async ({ doc, previousDoc, req }) => {
  if (req.context?.skipRevalidation) return doc

  const isPublished = doc._status === 'published'
  const wasPublished = previousDoc?._status === 'published'

  if (!isPublished && !wasPublished) return doc

  // Union current + previous categories so stale URLs are purged when category changes
  const currentCategories = doc.categories ?? []
  const previousCategories = previousDoc?.categories ?? []
  const allCategories = [...new Set([...currentCategories, ...previousCategories])]

  await revalidatePostPaths(doc.id, allCategories, req)

  return doc
}

/**
 * afterDelete hook: revalidates post detail pages after a published post is deleted.
 * Cannot use findByID — document is already gone from DB. Uses doc.slug directly.
 * doc.slug reflects the locale active during the delete request; [slug] pattern
 * wildcard covers the other locale.
 */
export const revalidatePostOnDelete: CollectionAfterDeleteHook<Post> = async ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc
  if (doc._status !== 'published') return doc

  const categories = doc.categories ?? []
  const relevantCategories = categories.filter((c) => CATEGORY_PATHS[c])
  if (relevantCategories.length === 0) return doc

  const slug = doc.slug
  if (!slug) return doc

  for (const category of relevantCategories) {
    const pathSegment = CATEGORY_PATHS[category]
    // Literal slug — covers the locale active during delete
    revalidatePath(`/(frontend)/[locale]/${pathSegment}/${slug}`, 'page')
    // Pattern wildcard — covers the other locale whose slug we can't fetch
    revalidatePath(`/(frontend)/[locale]/${pathSegment}/[slug]`, 'page')
    console.log(`[revalidate] Post delete revalidated: /${pathSegment}/${slug} (id: ${doc.id})`)
  }

  return doc
}
