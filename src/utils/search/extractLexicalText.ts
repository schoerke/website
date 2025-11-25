/**
 * Extracts plain text from Lexical richText JSON structure.
 * Recursively traverses the node tree and extracts text content.
 *
 * @param lexicalJSON - The Lexical JSON structure from a richText field
 * @returns Plain text string with spaces between text nodes
 */
export const extractLexicalText = (lexicalJSON: any): string => {
  if (!lexicalJSON || typeof lexicalJSON !== 'object') {
    return ''
  }

  // Handle root node
  if (lexicalJSON.root) {
    return extractLexicalText(lexicalJSON.root)
  }

  // Handle nodes with children
  if (Array.isArray(lexicalJSON.children)) {
    return lexicalJSON.children.map((child: any) => extractLexicalText(child)).join(' ')
  }

  // Handle text nodes
  if (lexicalJSON.text) {
    return lexicalJSON.text
  }

  return ''
}
