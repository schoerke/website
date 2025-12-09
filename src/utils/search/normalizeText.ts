/**
 * Normalize text for diacritic-insensitive search
 *
 * Converts text to lowercase and removes diacritical marks (accents)
 * to enable fuzzy matching. For example:
 * - "Christian Poltéra" → "christian poltera"
 * - "Müller" → "muller"
 * - "Dvořák" → "dvorak"
 *
 * This allows users to search for "Poltera" and find "Poltéra"
 *
 * @param text - Text to normalize
 * @returns Normalized text (lowercase, no diacritics)
 *
 * @example
 * ```typescript
 * normalizeText("Christian Poltéra") // "christian poltera"
 * normalizeText("Müller") // "muller"
 * ```
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose combined characters (é → e + ́)
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
}
