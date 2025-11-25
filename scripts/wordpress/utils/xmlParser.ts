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
 * Extract first paragraph from HTML content (for quotes)
 */
export function extractFirstParagraph(html: string): string {
  if (!html) return ''

  // Match content between first set of quotes (handles nested quotes)
  // Tries ASCII quotes first, then Unicode quotes
  let quotedMatch = html.match(/^"(.+?)"(\n|$)/s)
  if (quotedMatch) {
    return quotedMatch[1].trim()
  }

  quotedMatch = html.match(/^[""](.+?)[""](\n|$)/s)
  if (quotedMatch) {
    return quotedMatch[1].trim()
  }

  const paragraphMatch = html.match(/<p[^>]*>([^<]+)<\/p>/)
  if (paragraphMatch) {
    return paragraphMatch[1].trim()
  }

  return ''
}

/**
 * Clean HTML content (remove first paragraph if it's a quote)
 */
export function cleanBiographyHTML(html: string): string {
  if (!html) return ''

  // If starts with a quote (ASCII or Unicode), remove it from biography
  if (html.startsWith('"') || html.startsWith('"')) {
    const firstLineEnd = html.indexOf('\n')
    if (firstLineEnd > 0) {
      return html.substring(firstLineEnd + 1).trim()
    }
  }

  return html.trim()
}
