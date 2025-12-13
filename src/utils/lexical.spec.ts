import { describe, expect, it } from 'vitest'
import { extractLexicalImages, extractLexicalText, parseLexicalContent } from './lexical'

describe('Lexical parsing utilities', () => {
  describe('parseLexicalContent', () => {
    it('should extract plain text from simple paragraph', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Hello world',
                },
              ],
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.text).toBe('Hello world')
      expect(result.images).toEqual([])
    })

    it('should extract text from multiple paragraphs', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'First paragraph' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Second paragraph' }],
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.text).toBe('First paragraph Second paragraph')
      expect(result.images).toEqual([])
    })

    it('should extract single image URL from upload node', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Here is an image' }],
            },
            {
              type: 'upload',
              value: {
                url: '/api/images/file/screenshot.jpg',
                alt: 'Screenshot',
              },
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData, 'https://example.com')

      expect(result.text).toBe('Here is an image')
      expect(result.images).toEqual(['https://example.com/api/images/file/screenshot.jpg'])
    })

    it('should extract multiple image URLs', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Multiple screenshots' }],
            },
            {
              type: 'upload',
              value: { url: '/api/images/file/screenshot1.jpg' },
            },
            {
              type: 'upload',
              value: { url: '/api/images/file/screenshot2.jpg' },
            },
            {
              type: 'upload',
              value: { url: '/api/images/file/screenshot3.jpg' },
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData, 'https://example.com')

      expect(result.text).toBe('Multiple screenshots')
      expect(result.images).toEqual([
        'https://example.com/api/images/file/screenshot1.jpg',
        'https://example.com/api/images/file/screenshot2.jpg',
        'https://example.com/api/images/file/screenshot3.jpg',
      ])
    })

    it('should handle absolute image URLs', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: 'https://cdn.example.com/image.jpg' },
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.images).toEqual(['https://cdn.example.com/image.jpg'])
    })

    it('should handle string JSON input', () => {
      const lexicalDataString = JSON.stringify({
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Parsed from string' }],
            },
          ],
        },
      })

      const result = parseLexicalContent(lexicalDataString)

      expect(result.text).toBe('Parsed from string')
    })

    it('should return default text when no content', () => {
      const lexicalData = {
        root: {
          children: [],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.text).toBe('No description provided')
      expect(result.images).toEqual([])
    })

    it('should handle empty paragraphs', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Content' }],
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.text).toBe('Content')
    })

    it('should handle deeply nested structures', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [{ type: 'text', text: 'Nested item' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.text).toBe('Nested item')
    })

    it('should use localhost as default server URL', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: '/api/images/file/test.jpg' },
            },
          ],
        },
      }

      const result = parseLexicalContent(lexicalData)

      expect(result.images[0]).toMatch(/^http:\/\/localhost:3000\/api\/images/)
    })

    it('should handle real-world Lexical structure from Payload CMS', () => {
      // Actual structure from the issue description with image
      const lexicalData = {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: "Here's a new issue",
                  type: 'text',
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
              textFormat: 0,
              textStyle: '',
            },
            {
              type: 'upload',
              version: 3,
              format: '',
              id: '693d89cb3f5f2764d8b1ad35',
              fields: null,
              relationTo: 'images',
              value: {
                id: 60,
                alt: 'issue 1',
                url: '/api/images/file/Screenshot%202025-12-12%20at%2023.45.55.jpg',
                thumbnailURL: '/api/images/file/Screenshot%202025-12-12%20at%2023.45.55-400x300.webp',
                filename: 'Screenshot 2025-12-12 at 23.45.55.jpg',
                mimeType: 'image/jpeg',
                filesize: 176639,
                width: 1710,
                height: 342,
              },
            },
            {
              children: [],
              direction: null,
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
              textFormat: 0,
              textStyle: '',
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      }

      const result = parseLexicalContent(lexicalData, 'https://example.com')

      expect(result.text).toBe("Here's a new issue")
      expect(result.images).toEqual(['https://example.com/api/images/file/Screenshot%202025-12-12%20at%2023.45.55.jpg'])
    })
  })

  describe('extractLexicalText', () => {
    it('should extract only text content', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Only text needed' }],
            },
            {
              type: 'upload',
              value: { url: '/api/images/file/ignored.jpg' },
            },
          ],
        },
      }

      const text = extractLexicalText(lexicalData)

      expect(text).toBe('Only text needed')
    })
  })

  describe('extractLexicalImages', () => {
    it('should extract only image URLs', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Text is ignored' }],
            },
            {
              type: 'upload',
              value: { url: '/api/images/file/image1.jpg' },
            },
            {
              type: 'upload',
              value: { url: '/api/images/file/image2.jpg' },
            },
          ],
        },
      }

      const images = extractLexicalImages(lexicalData, 'https://example.com')

      expect(images).toEqual([
        'https://example.com/api/images/file/image1.jpg',
        'https://example.com/api/images/file/image2.jpg',
      ])
    })

    it('should return empty array when no images', () => {
      const lexicalData = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'No images here' }],
            },
          ],
        },
      }

      const images = extractLexicalImages(lexicalData)

      expect(images).toEqual([])
    })
  })
})
