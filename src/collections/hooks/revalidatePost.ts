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
 * Fetches slugs for all locales in parallel, then calls revalidatePath with the
 * actual URL path (e.g. /de/news/my-post) for each locale+slug combination.
 *
 * Why actual URLs, not route group paths:
 * Next.js tags each cached page with two implicit tags:
 *   1. The file-system pattern path (e.g. /(frontend)/[locale]/news/[slug]/layout)
 *   2. The resolved URL pathname (e.g. /de/news/my-post)
 * revalidatePath matches against these stored tags. A hybrid like
 * "/(frontend)/[locale]/news/my-post-slug" matches neither tag and has no effect.
 * Passing the resolved URL (e.g. /de/news/my-post) reliably hits tag #2.
 */
/**
 * Revalidates category list pages (e.g. /de/news, /en/projects) for all affected categories.
 * Called alongside detail page revalidation so the list reflects the change immediately.
 */
function revalidatePostListPages(categories: string[]): void {
  const relevantCategories = categories.filter((c) => CATEGORY_PATHS[c])
  for (const locale of LOCALES) {
    for (const category of relevantCategories) {
      const path = `/${locale}/${CATEGORY_PATHS[category]}`
      revalidatePath(path)
      console.log(`[revalidate] Post list page revalidated: ${path}`)
    }
  }
}

async function revalidatePostPaths(id: number, categories: string[], req: PayloadRequest): Promise<void> {
  const relevantCategories = categories.filter((c) => CATEGORY_PATHS[c])
  if (relevantCategories.length === 0) return

  // Revalidate list pages immediately (no async needed)
  revalidatePostListPages(relevantCategories)

  // Fetch localized slugs in parallel — slugs may differ between DE and EN
  const slugEntries = await Promise.all(
    LOCALES.map(async (locale) => ({ locale, slug: await getSlugForLocale(id, locale, req) }))
  )

  for (const { locale, slug } of slugEntries) {
    if (!slug) continue
    for (const category of relevantCategories) {
      // Use the resolved URL path — matches the pathname implicit tag on the cached page
      const path = `/${locale}/${CATEGORY_PATHS[category]}/${slug}`
      revalidatePath(path)
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
 *
 * Known limitation: post slugs are localized (DE and EN may differ). On delete we only
 * have the slug for the locale active at delete time. We revalidate both locale paths
 * using that same slug — if slugs differ across locales, the other locale's detail page
 * stays stale until next request. This is acceptable for deletes; list pages are always
 * correctly revalidated regardless.
 */
export const revalidatePostOnDelete: CollectionAfterDeleteHook<Post> = async ({ doc, req }) => {
  if (req.context?.skipRevalidation) return doc
  if (doc._status !== 'published') return doc

  const categories = doc.categories ?? []
  const relevantCategories = categories.filter((c) => CATEGORY_PATHS[c])
  if (relevantCategories.length === 0) return doc

  // Revalidate list pages
  revalidatePostListPages(relevantCategories)

  const slug = doc.slug
  if (!slug) return doc

  for (const category of relevantCategories) {
    const pathSegment = CATEGORY_PATHS[category]
    for (const locale of LOCALES) {
      // Use resolved URL path — matches the pathname implicit tag on the cached page
      revalidatePath(`/${locale}/${pathSegment}/${slug}`)
      console.log(`[revalidate] Post delete revalidated: /${locale}/${pathSegment}/${slug} (id: ${doc.id})`)
    }
  }

  return doc
}
