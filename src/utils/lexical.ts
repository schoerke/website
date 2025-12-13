/**
 * Lexical JSON parsing utilities
 *
 * Provides functions to extract text and media from Lexical editor JSON structure.
 */

interface LexicalNode {
  text?: string
  children?: unknown[]
  root?: unknown
  type?: string
  value?: {
    url?: string
    alt?: string
  }
}

interface LexicalParseResult {
  text: string
  images: string[]
}

/**
 * Extract text and images from Lexical JSON data structure.
 * Recursively traverses the Lexical node tree to extract plain text content
 * and image URLs from upload nodes.
 *
 * @param lexicalData - The Lexical JSON data (can be string or object)
 * @param serverUrl - Base server URL for constructing full image URLs (defaults to NEXT_PUBLIC_SERVER_URL or localhost)
 * @returns Object containing extracted text and array of image URLs
 *
 * @example
 * ```typescript
 * const result = parseLexicalContent({
 *   root: {
 *     children: [
 *       { children: [{ text: 'Hello world', type: 'text' }], type: 'paragraph' },
 *       { type: 'upload', value: { url: '/api/images/file/screenshot.jpg' } }
 *     ]
 *   }
 * })
 * // result.text => 'Hello world'
 * // result.images => ['http://localhost:3000/api/images/file/screenshot.jpg']
 * ```
 */
export function parseLexicalContent(lexicalData: string | object, serverUrl?: string): LexicalParseResult {
  const images: string[] = []
  const baseUrl = serverUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  // Parse string to object if needed
  const data = typeof lexicalData === 'string' ? JSON.parse(lexicalData) : lexicalData

  /**
   * Recursively extract content from Lexical nodes
   */
  const extractContent = (node: unknown): string => {
    if (typeof node !== 'object' || node === null) return ''

    const n = node as LexicalNode

    // Handle upload nodes (images)
    if (n.type === 'upload' && n.value?.url) {
      const fullImageUrl = n.value.url.startsWith('http') ? n.value.url : `${baseUrl}${n.value.url}`
      images.push(fullImageUrl)
      return '' // Don't include image URLs in text
    }

    // Handle text nodes
    if (n.text) return n.text

    // Handle nodes with children
    if (n.children) return n.children.map(extractContent).join(' ')

    // Handle root node
    if (n.root) return extractContent(n.root)

    return ''
  }

  const text = extractContent(data).trim() || 'No description provided'

  return { text, images }
}

/**
 * Extract only plain text from Lexical JSON data (no images).
 * Useful when you only need the text content.
 *
 * @param lexicalData - The Lexical JSON data (can be string or object)
 * @returns Extracted plain text
 *
 * @example
 * ```typescript
 * const text = extractLexicalText('{"root": {"children": [{"text": "Hello"}]}}')
 * // => 'Hello'
 * ```
 */
export function extractLexicalText(lexicalData: string | object): string {
  return parseLexicalContent(lexicalData).text
}

/**
 * Extract only image URLs from Lexical JSON data (no text).
 * Useful when you only need the images.
 *
 * @param lexicalData - The Lexical JSON data (can be string or object)
 * @param serverUrl - Base server URL for constructing full image URLs
 * @returns Array of image URLs
 *
 * @example
 * ```typescript
 * const images = extractLexicalImages(lexicalData, 'https://example.com')
 * // => ['https://example.com/api/images/file/screenshot.jpg']
 * ```
 */
export function extractLexicalImages(lexicalData: string | object, serverUrl?: string): string[] {
  return parseLexicalContent(lexicalData, serverUrl).images
}
