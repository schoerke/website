import { escapeHtml, sanitizeUrl } from './html'

/**
 * Lexical JSON parsing utilities
 *
 * Provides functions to extract text and media from Lexical editor JSON structure.
 */

interface LexicalNode {
  // Text content
  text?: string
  detail?: number
  format?: number
  mode?: string
  style?: string

  // Node structure
  children?: unknown[]
  root?: unknown
  type?: string

  // Upload node specific
  value?: {
    id?: number
    url?: string
    alt?: string
    filename?: string
    mimeType?: string
    width?: number
    height?: number
    thumbnailURL?: string
    sizes?: Record<string, unknown>
  }

  // Lexical metadata
  direction?: string | null
  indent?: number
  version?: number
  textFormat?: number
  textStyle?: string

  // Relations (for upload nodes)
  relationTo?: string
  fields?: unknown
  id?: string
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
  // Validate serverUrl if provided
  if (serverUrl && !/^https?:\/\/.+/.test(serverUrl)) {
    throw new Error('serverUrl must be a valid HTTP(S) URL')
  }

  const images: string[] = []
  const baseUrl = serverUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  // Parse string to object if needed with error handling
  let data: object
  if (typeof lexicalData === 'string') {
    try {
      data = JSON.parse(lexicalData)
    } catch (error) {
      throw new Error(`Invalid Lexical JSON: ${error instanceof Error ? error.message : 'Unable to parse JSON string'}`)
    }
  } else {
    data = lexicalData
  }

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

/**
 * Convert Lexical JSON to HTML, preserving inline images in their original positions.
 * Useful for email templates where you want to maintain the context of screenshots.
 *
 * @param lexicalData - The Lexical JSON data (can be string or object)
 * @param serverUrl - Base server URL for constructing full image URLs
 * @returns HTML string with text and inline images
 *
 * @example
 * ```typescript
 * const html = lexicalToHtml(lexicalData, 'https://example.com')
 * // => '<p>Description text</p><img src="https://example.com/api/images/file/screenshot.jpg" alt="Screenshot" /><p>More text</p>'
 * ```
 */
export function lexicalToHtml(lexicalData: string | object, serverUrl?: string): string {
  // Validate serverUrl if provided
  if (serverUrl && !/^https?:\/\/.+/.test(serverUrl)) {
    throw new Error('serverUrl must be a valid HTTP(S) URL')
  }

  const baseUrl = serverUrl || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  // Parse string to object if needed with error handling
  let data: object
  if (typeof lexicalData === 'string') {
    try {
      data = JSON.parse(lexicalData)
    } catch (error) {
      throw new Error(`Invalid Lexical JSON: ${error instanceof Error ? error.message : 'Unable to parse JSON string'}`)
    }
  } else {
    data = lexicalData
  }

  /**
   * Recursively convert Lexical nodes to HTML
   */
  const convertNode = (node: unknown): string => {
    if (typeof node !== 'object' || node === null) return ''

    const n = node as LexicalNode

    // Handle upload nodes (images)
    if (n.type === 'upload' && n.value?.url) {
      // Sanitize URL first before prepending baseUrl to catch dangerous protocols
      const sanitizedUrl = sanitizeUrl(n.value.url)
      const fullImageUrl =
        sanitizedUrl.startsWith('http') || sanitizedUrl === '#' ? sanitizedUrl : `${baseUrl}${sanitizedUrl}`
      const rawAlt = n.value.alt || 'Screenshot'
      // Validate and truncate alt text to prevent excessively long attributes
      const alt = rawAlt.length > 200 ? rawAlt.substring(0, 197) + '...' : rawAlt
      return `<div style="margin: 16px 0;"><img src="${fullImageUrl}" alt="${escapeHtml(alt)}" style="max-width: 100%; height: auto; border: 1px solid #e3e3e3; border-radius: 4px;" /></div>`
    }

    // Handle paragraph nodes
    if (n.type === 'paragraph') {
      const content = n.children ? n.children.map(convertNode).join('') : ''
      return content
        ? `<p style="color: #222126; font-size: 14px; margin: 12px 0; line-height: 1.6;">${content}</p>`
        : ''
    }

    // Handle text nodes
    if (n.text) return escapeHtml(n.text)

    // Handle nodes with children
    if (n.children) return n.children.map(convertNode).join('')

    // Handle root node
    if (n.root) return convertNode(n.root)

    return ''
  }

  const html = convertNode(data).trim()
  return html || '<p style="color: #222126; font-size: 14px; margin: 0; line-height: 1.6;">No description provided</p>'
}
