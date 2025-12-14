import { describe, expect, it } from 'vitest'
import { extractLexicalImages, extractLexicalText, lexicalToHtml, parseLexicalContent } from './lexical'

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

  describe('lexicalToHtml', () => {
    it('should convert simple paragraph to HTML with styling', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Hello world' }],
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('<p style="color: #222126')
      expect(html).toContain('Hello world')
      expect(html).toContain('</p>')
    })

    it('should render inline images with proper styling and sanitization', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'upload',
              value: {
                url: '/api/images/test.jpg',
                alt: 'Test image',
              },
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical, 'https://example.com')
      expect(html).toContain('<img src="https://example.com/api/images/test.jpg"')
      expect(html).toContain('alt="Test image"')
      expect(html).toContain('max-width: 100%')
      expect(html).toContain('border: 1px solid #e3e3e3')
      expect(html).toContain('<div style="margin: 16px 0;">')
    })

    it('should truncate long alt text to 200 characters', () => {
      const longAlt = 'a'.repeat(250)
      const lexical = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: '/test.jpg', alt: longAlt },
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('alt="' + 'a'.repeat(197) + '..."')
      expect(html).not.toContain('alt="' + longAlt + '"')
    })

    it('should escape HTML in text nodes', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: '<script>alert("XSS")</script>' }],
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>')
    })

    it('should escape HTML in alt attributes', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: '/test.jpg', alt: '" onload="alert(1)' },
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      // The alt attribute is escaped, so onload= appears as &quot;onload=&quot;
      expect(html).toContain('&quot;')
      expect(html).toContain('alt="&quot; onload=&quot;alert(1)"')
    })

    it('should handle multiple paragraphs with images interspersed', () => {
      const lexical = {
        root: {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'First' }] },
            { type: 'upload', value: { url: '/img1.jpg' } },
            { type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('First')
      expect(html).toContain('<img')
      expect(html).toContain('Second')
      expect(html.indexOf('First')).toBeLessThan(html.indexOf('<img'))
      expect(html.indexOf('<img')).toBeLessThan(html.indexOf('Second'))
    })

    it('should handle empty content gracefully', () => {
      const lexical = { root: { children: [] } }
      const html = lexicalToHtml(lexical)
      expect(html).toBe(
        '<p style="color: #222126; font-size: 14px; margin: 0; line-height: 1.6;">No description provided</p>',
      )
    })

    it('should sanitize dangerous URL protocols when used as absolute URLs', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: 'javascript:alert(1)', alt: 'Malicious' },
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('src="#"')
      expect(html).not.toContain('javascript:')
    })

    it('should throw error for invalid JSON string', () => {
      expect(() => lexicalToHtml('not-valid-json')).toThrow('Invalid Lexical JSON')
    })

    it('should validate serverUrl parameter is valid HTTP URL', () => {
      const lexical = { root: { children: [] } }
      expect(() => lexicalToHtml(lexical, 'not-a-url')).toThrow('serverUrl must be a valid HTTP(S) URL')
    })

    it('should handle absolute image URLs without serverUrl', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: 'https://cdn.example.com/image.jpg', alt: 'External' },
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('src="https://cdn.example.com/image.jpg"')
    })

    it('should handle real-world Payload Lexical structure', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: 'Issue description',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              version: 1,
              textFormat: 0,
              textStyle: '',
            },
            {
              type: 'upload',
              version: 3,
              format: '',
              id: '123abc',
              fields: null,
              relationTo: 'images',
              value: {
                id: 60,
                alt: 'Screenshot',
                url: '/api/images/file/screenshot.jpg',
                thumbnailURL: '/api/images/file/screenshot-400x300.webp',
                filename: 'screenshot.jpg',
                mimeType: 'image/jpeg',
                filesize: 176639,
                width: 1710,
                height: 342,
              },
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      }

      const html = lexicalToHtml(lexical, 'https://example.com')
      expect(html).toContain('Issue description')
      expect(html).toContain('<img src="https://example.com/api/images/file/screenshot.jpg"')
      expect(html).toContain('alt="Screenshot"')
    })

    it('should handle multiple text nodes in a paragraph', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: 'First part ' },
                { type: 'text', text: 'second part' },
              ],
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('First part second part')
    })

    it('should use default localhost URL when serverUrl not provided', () => {
      const lexical = {
        root: {
          children: [
            {
              type: 'upload',
              value: { url: '/api/images/test.jpg' },
            },
          ],
        },
      }

      const html = lexicalToHtml(lexical)
      expect(html).toContain('src="http://localhost:3000/api/images/test.jpg"')
    })
  })
})
