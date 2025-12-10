import type { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'

/**
 * Extracts plain text from Lexical richText JSON structure.
 * Recursively traverses the node tree and extracts text content.
 *
 * @param lexicalJSON - The Lexical JSON structure from a richText field
 * @returns Plain text string with spaces between text nodes
 */
export const extractLexicalText = (lexicalJSON: SerializedEditorState | SerializedLexicalNode): string => {
  if (!lexicalJSON || typeof lexicalJSON !== 'object') {
    return ''
  }

  // Handle root node
  if ('root' in lexicalJSON) {
    return extractLexicalText(lexicalJSON.root)
  }

  // Handle nodes with children
  if ('children' in lexicalJSON && Array.isArray(lexicalJSON.children)) {
    return lexicalJSON.children.map((child) => extractLexicalText(child)).join(' ')
  }

  // Handle text nodes
  if ('text' in lexicalJSON && typeof lexicalJSON.text === 'string') {
    return lexicalJSON.text
  }

  return ''
}
