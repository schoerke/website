/**
 * Generate URL-friendly slug from text
 *
 * Converts text to lowercase, removes diacritics and special characters,
 * and replaces spaces with hyphens.
 *
 * @example
 * generateSlug("Hello World") // "hello-world"
 * generateSlug("Künstler Konzert 2024") // "kunstler-konzert-2024"
 * generateSlug("Post über Música") // "post-uber-musica"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

/**
 * Create a beforeValidate hook for auto-generating slugs from a source field
 *
 * @param sourceField - The field name to generate the slug from (e.g., 'name', 'title')
 * @returns A Payload beforeValidate hook function
 *
 * @example
 * // In a Payload collection config:
 * {
 *   name: 'slug',
 *   type: 'text',
 *   hooks: {
 *     beforeValidate: [createSlugHook('name')]
 *   }
 * }
 */
export function createSlugHook(sourceField: string) {
  return ({ data, operation, value, req }: any) => {
    // Only generate slug on create or if slug is empty
    if (operation === 'create' || !value) {
      const sourceValue = data?.[sourceField]

      if (sourceValue) {
        // Handle localized fields
        if (typeof sourceValue === 'object' && req?.locale) {
          const localizedValue = sourceValue[req.locale]
          if (localizedValue) {
            return generateSlug(localizedValue)
          }
        }

        // Handle non-localized fields
        if (typeof sourceValue === 'string') {
          return generateSlug(sourceValue)
        }
      }
    }

    return value
  }
}
