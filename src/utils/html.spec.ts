import { describe, expect, it } from 'vitest'
import { escapeHtml, sanitizeUrl } from './html'

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
  })

  it('should escape ampersands', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should not double-escape', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('should escape all dangerous characters', () => {
    expect(escapeHtml('<>"&\'')).toBe('&lt;&gt;&quot;&amp;&#039;')
  })

  it('should preserve safe characters', () => {
    expect(escapeHtml('Hello World! 123')).toBe('Hello World! 123')
  })
})

describe('sanitizeUrl', () => {
  it('should block javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#')
  })

  it('should block data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#')
  })

  it('should block vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('#')
  })

  it('should allow https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
  })

  it('should allow http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('should allow mailto links', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
  })

  it('should trim whitespace', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com')
  })

  it('should handle case-insensitive protocol detection', () => {
    expect(sanitizeUrl('JavaScript:alert(1)')).toBe('#')
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#')
  })

  it('should block unknown protocols', () => {
    expect(sanitizeUrl('ftp://example.com')).toBe('#')
    expect(sanitizeUrl('file:///etc/passwd')).toBe('#')
  })

  it('should allow relative paths starting with /', () => {
    expect(sanitizeUrl('/admin/collections/issues/123')).toBe('/admin/collections/issues/123')
    expect(sanitizeUrl('/api/images/file/screenshot.jpg')).toBe('/api/images/file/screenshot.jpg')
  })

  it('should block relative paths not starting with /', () => {
    expect(sanitizeUrl('../../../etc/passwd')).toBe('#')
    expect(sanitizeUrl('../../sensitive/file')).toBe('#')
    expect(sanitizeUrl('relative/path')).toBe('#')
  })
})
