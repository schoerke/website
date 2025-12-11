import { describe, expect, it } from 'vitest'
import { extractLexicalText } from './extractLexicalText'

describe('extractLexicalText', () => {
  describe('simple text nodes', () => {
    it('should extract text from simple text node', () => {
      const node = {
        type: 'text',
        text: 'Hello World',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Hello World')
    })

    it('should return empty string for text node without text property', () => {
      const node = {
        type: 'paragraph',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('')
    })

    it('should handle empty text string', () => {
      const node = {
        type: 'text',
        text: '',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('')
    })
  })

  describe('root node handling', () => {
    it('should extract text from root node', () => {
      const editor = {
        root: {
          type: 'root',
          children: [
            {
              type: 'text',
              text: 'Root text',
              version: 1,
            },
          ],
          direction: null,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      }
      expect(extractLexicalText(editor)).toBe('Root text')
    })

    it('should handle root with multiple children', () => {
      const editor = {
        root: {
          type: 'root',
          children: [
            {
              type: 'text',
              text: 'First',
              version: 1,
            },
            {
              type: 'text',
              text: 'Second',
              version: 1,
            },
          ],
          direction: null,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      }
      expect(extractLexicalText(editor)).toBe('First Second')
    })
  })

  describe('nested children', () => {
    it('should extract text from nested children', () => {
      const node = {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Hello',
            version: 1,
          },
          {
            type: 'text',
            text: 'World',
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Hello World')
    })

    it('should handle deeply nested structures', () => {
      const node = {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Level 1',
                version: 1,
              },
              {
                type: 'heading',
                children: [
                  {
                    type: 'text',
                    text: 'Level 2',
                    version: 1,
                  },
                ],
                tag: 'h1',
                version: 1,
              },
            ],
            direction: null,
            format: '' as const,
            indent: 0,
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Level 1 Level 2')
    })

    it('should join multiple text nodes with spaces', () => {
      const node = {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'One',
            version: 1,
          },
          {
            type: 'text',
            text: 'Two',
            version: 1,
          },
          {
            type: 'text',
            text: 'Three',
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('One Two Three')
    })
  })

  describe('empty and invalid inputs', () => {
    it('should return empty string for null input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractLexicalText(null as any)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractLexicalText(undefined as any)).toBe('')
    })

    it('should return empty string for non-object input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractLexicalText('invalid' as any)).toBe('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractLexicalText(123 as any)).toBe('')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(extractLexicalText(true as any)).toBe('')
    })

    it('should handle empty children array', () => {
      const node = {
        type: 'paragraph',
        children: [],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('')
    })

    it('should handle node with no relevant properties', () => {
      const node = {
        type: 'custom',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('')
    })
  })

  describe('complex document structures', () => {
    it('should extract text from typical blog post structure', () => {
      const editor = {
        root: {
          type: 'root',
          children: [
            {
              type: 'heading',
              children: [
                {
                  type: 'text',
                  text: 'Introduction',
                  version: 1,
                },
              ],
              tag: 'h1',
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'This is the first paragraph.',
                  version: 1,
                },
              ],
              direction: null,
              format: '' as const,
              indent: 0,
              version: 1,
            },
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'This is the second paragraph.',
                  version: 1,
                },
              ],
              direction: null,
              format: '' as const,
              indent: 0,
              version: 1,
            },
          ],
          direction: null,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      }
      expect(extractLexicalText(editor)).toBe('Introduction This is the first paragraph. This is the second paragraph.')
    })

    it('should extract text from list structure', () => {
      const node = {
        type: 'list',
        children: [
          {
            type: 'listitem',
            children: [
              {
                type: 'text',
                text: 'Item 1',
                version: 1,
              },
            ],
            version: 1,
            value: 1,
          },
          {
            type: 'listitem',
            children: [
              {
                type: 'text',
                text: 'Item 2',
                version: 1,
              },
            ],
            version: 1,
            value: 2,
          },
        ],
        listType: 'bullet',
        start: 1,
        tag: 'ul',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Item 1 Item 2')
    })

    it('should handle mixed content with formatted text', () => {
      const node = {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Normal text ',
            version: 1,
          },
          {
            type: 'text',
            text: 'bold text',
            format: 1, // bold
            version: 1,
          },
          {
            type: 'text',
            text: ' and ',
            version: 1,
          },
          {
            type: 'text',
            text: 'italic text',
            format: 2, // italic
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Normal text  bold text  and  italic text')
    })
  })

  describe('edge cases', () => {
    it('should handle nodes with children but no text', () => {
      const node = {
        type: 'paragraph',
        children: [
          {
            type: 'image',
            src: 'image.jpg',
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('')
    })

    it('should handle mixed children with some having text and some not', () => {
      const node = {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Before image',
            version: 1,
          },
          {
            type: 'image',
            src: 'image.jpg',
            version: 1,
          },
          {
            type: 'text',
            text: 'After image',
            version: 1,
          },
        ],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Before image  After image')
    })

    it('should handle text with special characters', () => {
      const node = {
        type: 'text',
        text: 'Special chars: @#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Special chars: @#$%^&*()_+-=[]{}|;:\'",.<>?/~`')
    })

    it('should handle text with unicode characters', () => {
      const node = {
        type: 'text',
        text: 'Unicode: 你好世界 🌍 Ψ α β',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Unicode: 你好世界 🌍 Ψ α β')
    })

    it('should handle text with newlines and tabs', () => {
      const node = {
        type: 'text',
        text: 'Line 1\nLine 2\tTabbed',
        version: 1,
      }
      expect(extractLexicalText(node)).toBe('Line 1\nLine 2\tTabbed')
    })
  })
})
