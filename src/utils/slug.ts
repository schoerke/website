import { FieldHook } from 'payload'

/**
 * Maximum length of a generated slug in bytes.
 *
 * Keeps slugs under the 255-byte per-path-segment limit of common filesystems
 * (ext4, APFS). Next.js writes prerendered routes under directories named after
 * each slug, so an unbounded slug breaks the build with ENAMETOOLONG.
 */
const SLUG_MAX_LENGTH = 240

/**
 * Deterministic 32-bit hash used to keep truncated slugs unique.
 *
 * Best-effort uniqueness: a 1/4-billion collision space per same-prefix pair.
 */
function slugHash(text: string): string {
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * Truncates a slug to a safe byte length, appending a short hash suffix so
 * distinct long inputs stay unique. Trailing hyphens in the truncated base are
 * dropped before the suffix is appended.
 */
function truncateSlug(slug: string): string {
  if (Buffer.byteLength(slug) <= SLUG_MAX_LENGTH) return slug

  const suffix = `-${slugHash(slug)}`
  const baseBytes = Math.max(SLUG_MAX_LENGTH - suffix.length, 1)
  let truncated = slug
  while (Buffer.byteLength(truncated) > baseBytes) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated.replace(/-+$/, '')}${suffix}`
}

/**
 * Generate URL-friendly slug from text
 *
 * Converts text to lowercase, removes diacritics and special characters,
 * and replaces spaces with hyphens. Result is capped to 240 bytes.
 *
 * @example
 * generateSlug("Hello World") // "hello-world"
 * generateSlug("Künstler Konzert 2024") // "kunstler-konzert-2024"
 * generateSlug("Post über Música") // "post-uber-musica"
 */
export function generateSlug(text: string): string {
  return truncateSlug(
    text
      .toLowerCase()
      .normalize('NFD') // Normalize unicode characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
  )
}

/**
 * Create a Payload CMS beforeValidate hook that auto-generates slugs from a source field
 *
 * @param sourceField - The field name to generate the slug from
 * @returns A beforeValidate hook function
 *
 * @example
 * {
 *   name: 'slug',
 *   type: 'text',
 *   hooks: {
 *     beforeValidate: [createSlugHook('name')]
 *   }
 * }
 */
/**
 * Extracts the source string for the active locale from a field value
 * (plain string or localized object keyed by locale code).
 */
function extractSourceValue(
  data: Record<string, unknown> | undefined,
  sourceField: string,
  locale: string | undefined
): string | undefined {
  const sourceValue = data?.[sourceField]

  if (!sourceValue) return undefined

  if (typeof sourceValue === 'object' && locale) {
    const localizedValue = (sourceValue as Record<string, unknown>)[locale]
    return typeof localizedValue === 'string' ? localizedValue : undefined
  }

  return typeof sourceValue === 'string' ? sourceValue : undefined
}

export function createSlugHook(sourceField: string): FieldHook {
  return ({ data, value, operation, originalDoc, req }) => {
    // Respect an explicitly passed slug on create (e.g. imports/migrations).
    if (operation === 'create' && value) return value

    const sourceValue = extractSourceValue(data as Record<string, unknown> | undefined, sourceField, req?.locale)

    if (sourceValue) {
      // Regenerate whenever the source field is present and either this is a
      // create, or (on update) the source actually changed. Preserves slugs
      // for content-only edits so URLs stay stable.
      const sourceBefore = extractSourceValue(
        originalDoc as Record<string, unknown> | undefined,
        sourceField,
        req?.locale
      )
      if (operation === 'create' || !originalDoc || sourceBefore !== sourceValue) {
        return generateSlug(sourceValue)
      }
    }

    return value
  }
}
