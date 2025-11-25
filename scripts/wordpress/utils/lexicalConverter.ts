/**
 * HTML to Lexical Conversion
 *
 * Converts WordPress HTML content to Payload CMS Lexical format
 */

interface LexicalNode {
  type: string
  version: number
  [key: string]: any
}

interface LexicalRoot {
  root: {
    type: 'root'
    format: ''
    indent: number
    version: number
    children: LexicalNode[]
    direction: 'ltr' | 'rtl' | null
  }
}

/**
 * Convert HTML to Lexical format
 *
 * For now, this is a simple converter that handles basic formatting.
 * TODO: Enhance with proper HTML parsing for complex structures
 */
export function htmlToLexical(html: string): LexicalRoot {
  if (!html || !html.trim()) {
    return createEmptyLexical()
  }

  const children: LexicalNode[] = []

  // Split by paragraphs (basic approach)
  const paragraphs = html
    .split(/<\/?p[^>]*>/gi)
    .filter((p) => p.trim())
    .map((p) => p.trim())

  for (const para of paragraphs) {
    if (!para) continue

    // Create paragraph node with text
    const textNodes = parseInlineHTML(para)

    if (textNodes.length > 0) {
      children.push({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: textNodes,
        direction: 'ltr',
      })
    }
  }

  // If no paragraphs found, treat as single paragraph
  if (children.length === 0) {
    const textNodes = parseInlineHTML(html)
    if (textNodes.length > 0) {
      children.push({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: textNodes,
        direction: 'ltr',
      })
    }
  }

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: 'ltr',
    },
  }
}

/**
 * Parse inline HTML (bold, italic, links, etc.)
 */
function parseInlineHTML(html: string): LexicalNode[] {
  const nodes: LexicalNode[] = []

  // Strip HTML tags and preserve text for now
  // TODO: Parse <strong>, <em>, <a>, etc. properly
  const cleanText = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

  if (cleanText.trim()) {
    nodes.push({
      type: 'text',
      version: 1,
      text: cleanText,
      format: 0,
      mode: 'normal',
      style: '',
      detail: 0,
    })
  }

  return nodes
}

/**
 * Create empty Lexical structure
 */
function createEmptyLexical(): LexicalRoot {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [],
      direction: 'ltr',
    },
  }
}
