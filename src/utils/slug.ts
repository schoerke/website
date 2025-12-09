import { FieldHook } from 'payload'

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
export function createSlugHook(sourceField: string): FieldHook {
  return ({ data, operation, value, req }) => {
    // Only generate slug on create or if slug is empty
    if (operation === 'create' || !value) {
      const sourceValue = data?.[sourceField]

      if (sourceValue) {
        // Handle localized fields
        if (typeof sourceValue === 'object' && req?.locale) {
          const localizedValue = (sourceValue as Record<string, unknown>)[req.locale]
          if (typeof localizedValue === 'string') {
            return generateSlug(localizedValue)
          }
        }

        // Handle simple string fields
        if (typeof sourceValue === 'string') {
          return generateSlug(sourceValue)
        }
      }
    }

    return value
  }
}
