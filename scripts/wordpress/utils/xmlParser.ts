/**
 * WordPress XML Parsing Utilities
 *
 * Helper functions for parsing WordPress XML exports
 */

import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs/promises'

export interface WordPressItem {
  title: string
  'wp:post_name': string
  'wp:post_id': number
  'wp:post_type': string
  'wp:status': string
  'wp:postmeta'?: WordPressPostMeta | WordPressPostMeta[]
  'content:encoded'?: string
}

export interface WordPressPostMeta {
  'wp:meta_key': string
  'wp:meta_value': string | number
}

/**
 * Parse WordPress XML file into items
 */
export async function parseWordPressXML(filePath: string): Promise<WordPressItem[]> {
  const xmlData = await fs.readFile(filePath, 'utf8')
  const parser = new XMLParser()
  const wpData = parser.parse(xmlData)

  const items = wpData.rss?.channel?.item || []
  return Array.isArray(items) ? items : [items]
}

/**
 * Parse WordPress postmeta into key-value object
 */
export function parsePostMeta(postmeta: any): Record<string, string | number> {
  if (!postmeta) return {}

  const metaArray = Array.isArray(postmeta) ? postmeta : [postmeta]
  const result: Record<string, string | number> = {}

  for (const meta of metaArray) {
    const key = meta['wp:meta_key']
    const value = meta['wp:meta_value']
    if (key && value !== undefined) {
      result[key] = value
    }
  }

  return result
}

/**
 * Extract quote from HTML content
 * Handles multiple quote patterns:
 * 1. Standard inline quotes: "Quote text"
 * 2. Partial quotes with attribution: 'Quote text' - Author continues...
 * 3. Blockquote tags: <blockquote>Quote text</blockquote>
 * 4. Multi-sentence quotes within one set of quote marks
 */
export function extractQuote(html: string): string {
  if (!html) return ''

  // Remove blockquote elements first
  let cleaned = html.replace(/<\/?blockquote[^>]*>/g, '').trim()

  // Get first non-empty line (skip empty lines and &nbsp; entities)
  const lines = cleaned.split('\n')
  let firstLine = ''
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines, &nbsp; entities, and HTML tags that aren't text content
    if (
      trimmed &&
      trimmed !== '&nbsp;' &&
      !/^(&nbsp;|\s)+$/.test(trimmed) &&
      !/^<(strong|span|em|div|p)[^>]*>/.test(trimmed)
    ) {
      firstLine = trimmed
      break
    }
  }
  if (!firstLine) return ''

  // Pattern 1: Standard inline quoted text (starts AND ends with quote marks)
  const standardQuotePattern = /^["'""''„].*["'""'']$/
  if (standardQuotePattern.test(firstLine)) {
    // Strip first layer of surrounding quotes (ASCII and Unicode)
    const withoutOuterQuotes = firstLine
      .replace(/^["'""''„]/, '') // Remove leading quote
      .replace(/["'""'']$/, '') // Remove trailing quote
      .trim()
    return withoutOuterQuotes
  }

  // Pattern 2: Partial quote with continuation (e.g., 'Quote text' - continuation...)
  // This pattern indicates a quote fragment followed by elaboration on the same line
  // Return the full line as the quote
  const partialQuotePattern = /^(["'""''„])(.+?)\1\s*[-–—]/
  const partialMatch = firstLine.match(partialQuotePattern)
  if (partialMatch) {
    // Return the full line (quoted part + continuation)
    return firstLine
  }

  // No valid quote pattern found
  return ''
}

/**
 * Clean HTML content (remove first quote if it was extracted)
 * Handles the same patterns as extractQuote to ensure the quote is removed from biography
 */
export function cleanBiographyHTML(html: string): string {
  if (!html) return ''

  // Remove blockquote elements first
  let cleaned = html.replace(/<\/?blockquote[^>]*>/g, '').trim()

  // Split into lines to find where the quote is
  const lines = cleaned.split('\n')
  let quoteLineIndex = -1

  // Find the first line that's a quote (same logic as extractQuote)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    // Skip empty lines, &nbsp; entities, and HTML tags
    if (
      !trimmed ||
      trimmed === '&nbsp;' ||
      /^(&nbsp;|\s)+$/.test(trimmed) ||
      /^<(strong|span|em|div|p)[^>]*>/.test(trimmed)
    ) {
      continue
    }

    // Check if this line is a quote
    const standardQuotePattern = /^["'""''„].*["'""'']$/
    const partialQuotePattern = /^(["'""''„])(.+?)\1\s*[-–—]/

    if (standardQuotePattern.test(trimmed) || partialQuotePattern.test(trimmed)) {
      quoteLineIndex = i
      break
    } else {
      // Not a quote - this is the start of biography
      break
    }
  }

  // If we found a quote, remove everything up to and including that line
  if (quoteLineIndex >= 0) {
    const remainingLines = lines.slice(quoteLineIndex + 1)
    return remainingLines
      .join('\n')
      .trim()
      .replace(/^(&nbsp;\s*)+/, '') // Remove leading &nbsp; entities
      .trim()
  }

  return html.trim()
}
