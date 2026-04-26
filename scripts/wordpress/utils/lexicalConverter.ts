/**
 * HTML to Lexical Conversion Utility
 *
 * Comprehensive converter for WordPress HTML content to Payload CMS Lexical format.
 * Handles common WordPress patterns including:
 * - Paragraphs (<p>), line breaks (<br>), and double newlines
 * - Bold (<strong>, <b>), italic (<em>, <i>)
 * - Links (<a>)
 * - Inline styling (<span style="...">) - strips styles but preserves text
 * - HTML entities (&nbsp;, &amp;, etc.)
 * - Nested formatting (e.g., <span><strong>text</strong></span>)
 * - Bare YouTube/Spotify URLs (converted to Lexical link nodes)
 *
 * @example
 * const lexical = htmlToLexical('<p><strong>Bold text</strong> and <em>italic</em></p>')
 */

interface LexicalNode {
  type: string
  version: number
  [key: string]: unknown
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

interface TextSegment {
  text: string
  bold: boolean
  italic: boolean
  link?: string
}

/** Regex matching YouTube or Spotify URLs that should become embed links */
const MEDIA_URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/watch\?|youtu\.be\/|open\.spotify\.com\/)/

/**
 * Clean and normalise a bare media URL:
 * - Decode HTML entities (&amp; → &)
 * - Strip WordPress `[/embed]` remnants and anything after them
 * - Strip concatenated garbage text appended directly to the URL
 *   (e.g. "https://youtu.be/20D2ZHoFOfoBaroque" — keep only valid URL chars)
 */
function cleanMediaUrl(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/\[\/embed\].*$/, '')
    .replace(/[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, '')
    .trim()
}

/**
 * If a paragraph's raw HTML is nothing but a bare YouTube/Spotify URL
 * (optionally wrapped in whitespace), return the cleaned URL; otherwise null.
 */
function extractBareMediaUrl(paraHtml: string): string | null {
  // Decode common HTML entities before testing, so &amp; in URLs doesn't break detection
  let stripped = paraHtml
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
  // Strip WordPress [embed]...[/embed] wrappers
  stripped = stripped.replace(/^\[embed\](.*?)\[\/embed\]$/i, '$1').trim()
  if (MEDIA_URL_REGEX.test(stripped)) {
    return cleanMediaUrl(stripped)
  }
  return null
}

/**
 * Convert HTML to Lexical format
 *
 * @param html - Raw HTML string from WordPress
 * @returns Lexical JSON structure for Payload CMS
 */
export function htmlToLexical(html: string): LexicalRoot {
  if (!html || !html.trim()) {
    return createEmptyLexical()
  }

  const children: LexicalNode[] = []

  // First try splitting by <p> tags
  const htmlParagraphs = html
    .split(/<\/?p[^>]*>/gi)
    .filter((p) => p.trim())
    .map((p) => p.trim())

  // If we found <p> tags, use them
  if (htmlParagraphs.length > 1) {
    for (const para of htmlParagraphs) {
      if (!para) continue

      // Detect bare media URLs — emit a link-wrapped paragraph
      const mediaUrl = extractBareMediaUrl(para)
      if (mediaUrl) {
        const textNode: LexicalNode = {
          type: 'text',
          version: 1,
          text: mediaUrl,
          format: 0,
          mode: 'normal',
          style: '',
          detail: 0,
        }
        children.push(createParagraphNode([createLinkNode(mediaUrl, [textNode])]))
        continue
      }

      const textNodes = parseInlineHTML(para)
      if (textNodes.length > 0) {
        children.push(createParagraphNode(textNodes))
      }
    }
  } else {
    // No <p> tags — split by newlines first, check each line for bare media URLs
    const lines = html.split('\n')
    let nonMediaLines: string[] = []

    const flushNonMediaLines = () => {
      if (nonMediaLines.length === 0) return
      const chunk = nonMediaLines.join('\n')
      nonMediaLines = []
      const tempNodes = parseInlineHTML(chunk)
      let currentParagraphNodes: LexicalNode[] = []
      let consecutiveLinebreaks = 0
      for (const node of tempNodes) {
        if (node.type === 'linebreak') {
          consecutiveLinebreaks++
          if (consecutiveLinebreaks === 2 && currentParagraphNodes.length > 0) {
            children.push(createParagraphNode(currentParagraphNodes))
            currentParagraphNodes = []
            consecutiveLinebreaks = 0
          } else if (consecutiveLinebreaks === 1) {
            currentParagraphNodes.push(node)
          }
        } else {
          consecutiveLinebreaks = 0
          currentParagraphNodes.push(node)
        }
      }
      if (currentParagraphNodes.length > 0) {
        children.push(createParagraphNode(currentParagraphNodes))
      }
    }

    for (const line of lines) {
      const trimmed = line.trim()
      const mediaUrl = trimmed ? extractBareMediaUrl(trimmed) : null
      if (mediaUrl) {
        flushNonMediaLines()
        const textNode: LexicalNode = {
          type: 'text',
          version: 1,
          text: mediaUrl,
          format: 0,
          mode: 'normal',
          style: '',
          detail: 0,
        }
        children.push(createParagraphNode([createLinkNode(mediaUrl, [textNode])]))
      } else {
        nonMediaLines.push(line)
      }
    }
    flushNonMediaLines()
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
 * Parse inline HTML formatting (bold, italic, links, etc.)
 *
 * Handles nested tags like:
 * - <span style="..."><strong>text</strong></span>
 * - <strong><em>text</em></strong>
 * - <a href="..."><strong>text</strong></a>
 *
 * @param html - HTML fragment to parse
 * @returns Array of Lexical text/linebreak nodes
 */
function parseInlineHTML(html: string): LexicalNode[] {
  const nodes: LexicalNode[] = []

  // First pass: decode HTML entities and convert <br> to newlines
  const processed = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')

  // Extract text segments with their formatting
  const segments = extractFormattedSegments(processed)

  // Convert segments to Lexical nodes, handling line breaks
  for (const segment of segments) {
    const lines = segment.text.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Add text node if line has content
      if (line) {
        const textNode: LexicalNode = {
          type: 'text',
          version: 1,
          text: line,
          format: calculateFormat(segment),
          mode: 'normal',
          style: '',
          detail: 0,
        }

        // If this is a link, wrap in a link node
        if (segment.link && segment.link.trim()) {
          nodes.push(createLinkNode(segment.link, [textNode]))
        } else {
          nodes.push(textNode)
        }
      }

      // Add linebreak node between lines (but not after the last line)
      if (i < lines.length - 1) {
        nodes.push({
          type: 'linebreak',
          version: 1,
        })
      }
    }
  }

  return nodes
}

/**
 * Extract text segments with their formatting information
 *
 * This function handles nested HTML tags and preserves formatting state.
 * It strips <span> tags but preserves <strong>, <em>, <b>, <i>, <a>.
 *
 * @param html - HTML string with inline formatting
 * @returns Array of text segments with formatting metadata
 */
function extractFormattedSegments(html: string): TextSegment[] {
  const segments: TextSegment[] = []

  // Track current position and formatting state
  let currentPos = 0
  let textBuffer = ''
  let currentBold = false
  let currentItalic = false
  let currentLink: string | undefined

  // Stack to track nested tags
  const tagStack: Array<{ type: string; link?: string }> = []

  // Regular expression to match opening/closing tags
  const tagRegex = /<\/?([a-z][a-z0-9]*)[^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html)) !== null) {
    const fullMatch = match[0]
    const tagName = match[1].toLowerCase()
    const isClosing = fullMatch.startsWith('</')

    // Add text before this tag
    const textBefore = html.slice(currentPos, match.index)
    if (textBefore) {
      textBuffer += textBefore
    }

    // Handle tag
    if (!isClosing) {
      // Opening tag
      if (tagName === 'strong' || tagName === 'b') {
        // Flush current text buffer if format is changing
        if (textBuffer) {
          segments.push({ text: textBuffer, bold: currentBold, italic: currentItalic, link: currentLink })
          textBuffer = ''
        }
        currentBold = true
        tagStack.push({ type: 'bold' })
      } else if (tagName === 'em' || tagName === 'i') {
        if (textBuffer) {
          segments.push({ text: textBuffer, bold: currentBold, italic: currentItalic, link: currentLink })
          textBuffer = ''
        }
        currentItalic = true
        tagStack.push({ type: 'italic' })
      } else if (tagName === 'a') {
        // Extract href
        const hrefMatch = fullMatch.match(/href=["']([^"']+)["']/)
        const href = hrefMatch ? hrefMatch[1] : undefined
        if (textBuffer) {
          segments.push({ text: textBuffer, bold: currentBold, italic: currentItalic, link: currentLink })
          textBuffer = ''
        }
        currentLink = href
        tagStack.push({ type: 'link', link: href })
      }
      // Ignore other tags (span, div, etc.) but keep their content
    } else {
      // Closing tag
      if (tagName === 'strong' || tagName === 'b' || tagName === 'em' || tagName === 'i' || tagName === 'a') {
        // Flush text buffer
        if (textBuffer) {
          segments.push({ text: textBuffer, bold: currentBold, italic: currentItalic, link: currentLink })
          textBuffer = ''
        }

        // Pop from stack and update formatting state
        const popped = tagStack.pop()
        if (popped?.type === 'bold') currentBold = false
        if (popped?.type === 'italic') currentItalic = false
        if (popped?.type === 'link') currentLink = undefined
      }
    }

    currentPos = match.index + fullMatch.length
  }

  // Add remaining text
  const remainingText = html.slice(currentPos)
  if (remainingText) {
    textBuffer += remainingText
  }

  if (textBuffer) {
    segments.push({ text: textBuffer, bold: currentBold, italic: currentItalic, link: currentLink })
  }

  // Clean up segments: strip any remaining HTML tags
  // IMPORTANT: Don't trim() here - it removes newlines!
  return segments
    .map((seg) => ({
      ...seg,
      text: seg.text.replace(/<[^>]+>/g, ''),
    }))
    .filter((seg) => seg.text.trim()) // Only filter completely empty segments
}

/**
 * Calculate Lexical format value from segment formatting
 *
 * Lexical uses a bitmask for text formatting:
 * - 1 = bold
 * - 2 = italic
 * - 3 = bold + italic
 */
function calculateFormat(segment: TextSegment): number {
  let format = 0
  if (segment.bold) format |= 1
  if (segment.italic) format |= 2
  return format
}

/**
 * Create a paragraph node
 */
function createParagraphNode(children: LexicalNode[]): LexicalNode {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    children,
    direction: 'ltr',
    textFormat: 0,
    textStyle: '',
  }
}

/**
 * Create a link node
 */
function createLinkNode(url: string, children: LexicalNode[]): LexicalNode {
  return {
    type: 'link',
    version: 3,
    url,
    rel: null,
    target: null,
    title: null,
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    fields: {
      linkType: 'custom',
      url,
      newTab: false,
    },
  }
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
