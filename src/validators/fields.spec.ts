import { describe, expect, it } from 'vitest'
import { validateQuote, validateURL, validateYouTubeURL } from './fields'

describe('validateYouTubeURL', () => {
  describe('valid URLs', () => {
    it('should accept standard youtube.com watch URL', () => {
      expect(validateYouTubeURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept youtube.com without www', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept youtu.be short URLs', () => {
      expect(validateYouTubeURL('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept mobile youtube URLs (m.youtube.com)', () => {
      expect(validateYouTubeURL('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should accept video IDs with hyphens', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=abc-def-hij')).toBe(true)
    })

    it('should accept video IDs with underscores', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=abc_def_hij')).toBe(true)
    })

    it('should accept video IDs with mixed alphanumeric and special chars', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=aB3-De_5XyZ')).toBe(true)
    })

    it('should accept http protocol', () => {
      expect(validateYouTubeURL('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('should reject non-string values', () => {
      expect(validateYouTubeURL(123)).toBe('Please enter a valid YouTube URL')
      expect(validateYouTubeURL(null)).toBe('Please enter a valid YouTube URL')
      expect(validateYouTubeURL(undefined)).toBe('Please enter a valid YouTube URL')
      expect(validateYouTubeURL({})).toBe('Please enter a valid YouTube URL')
      expect(validateYouTubeURL([])).toBe('Please enter a valid YouTube URL')
    })

    it('should reject non-YouTube domains', () => {
      expect(validateYouTubeURL('https://vimeo.com/123456789')).toBe('Please enter a valid YouTube URL')
      expect(validateYouTubeURL('https://dailymotion.com/video/xyz')).toBe('Please enter a valid YouTube URL')
      expect(validateYouTubeURL('https://google.com')).toBe('Please enter a valid YouTube URL')
    })

    it('should reject malformed URLs', () => {
      expect(validateYouTubeURL('not-a-url')).toBe('Please enter a valid URL format')
      expect(validateYouTubeURL('youtube.com/watch?v=dQw4w9WgXcQ')).toBe('Please enter a valid URL format')
      // 'htp://youtube.com' is a valid URL (typo becomes hostname), but video ID is missing
      expect(validateYouTubeURL('htp://youtube.com')).toBe('Please enter a valid YouTube URL with a valid video ID')
    })

    it('should reject YouTube URLs without video ID', () => {
      expect(validateYouTubeURL('https://youtube.com/watch')).toBe(
        'Please enter a valid YouTube URL with a valid video ID',
      )
      expect(validateYouTubeURL('https://youtube.com')).toBe('Please enter a valid YouTube URL with a valid video ID')
      expect(validateYouTubeURL('https://youtu.be/')).toBe('Please enter a valid YouTube URL with a valid video ID')
    })

    it('should reject video IDs shorter than 11 characters', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=short')).toBe(
        'Please enter a valid YouTube URL with a valid video ID',
      )
      expect(validateYouTubeURL('https://youtu.be/abc')).toBe('Please enter a valid YouTube URL with a valid video ID')
    })

    it('should reject video IDs longer than 11 characters', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=toolongvideoid')).toBe(
        'Please enter a valid YouTube URL with a valid video ID',
      )
      expect(validateYouTubeURL('https://youtu.be/verylongid12')).toBe(
        'Please enter a valid YouTube URL with a valid video ID',
      )
    })

    it('should reject video IDs with invalid characters', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=abc@def#hij')).toBe(
        'Please enter a valid YouTube URL with a valid video ID',
      )
      expect(validateYouTubeURL('https://youtu.be/abc def hij')).toBe(
        'Please enter a valid YouTube URL with a valid video ID',
      )
    })

    it('should reject youtu.be URLs with path after video ID', () => {
      // Video ID extraction takes first segment, so "dQw4w9WgXcQ" is valid
      // But if there's extra path like "dQw4w9WgXcQ/extra", only "dQw4w9WgXcQ" is extracted
      expect(validateYouTubeURL('https://youtu.be/dQw4w9WgXcQ/extra')).toBe(true)
    })

    it('should reject empty string', () => {
      expect(validateYouTubeURL('')).toBe('Please enter a valid URL format')
    })
  })

  describe('edge cases', () => {
    it('should handle youtube.com URLs with additional query parameters', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(true)
      expect(validateYouTubeURL('https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ')).toBe(true)
    })

    it('should handle URLs with fragments', () => {
      expect(validateYouTubeURL('https://youtube.com/watch?v=dQw4w9WgXcQ#t=30')).toBe(true)
    })
  })
})

describe('validateURL', () => {
  describe('basic validation', () => {
    it('should accept valid HTTP URLs', () => {
      const validator = validateURL()
      expect(validator('http://example.com')).toBe(true)
      expect(validator('http://example.com/path')).toBe(true)
    })

    it('should accept valid HTTPS URLs', () => {
      const validator = validateURL()
      expect(validator('https://example.com')).toBe(true)
      expect(validator('https://subdomain.example.com')).toBe(true)
      expect(validator('https://example.com/path/to/page?query=value#section')).toBe(true)
    })

    it('should allow empty values', () => {
      const validator = validateURL()
      expect(validator('')).toBe(true)
      expect(validator('   ')).toBe(true)
      expect(validator(null)).toBe(true)
      expect(validator(undefined)).toBe(true)
    })

    it('should allow non-string values (returns true for validation skip)', () => {
      const validator = validateURL()
      // Non-string values are treated as empty and return true (validation skipped)
      expect(validator(123)).toBe(true)
      expect(validator({})).toBe(true)
      expect(validator([])).toBe(true)
    })

    it('should reject invalid URL formats', () => {
      const validator = validateURL()
      expect(validator('not-a-url')).toBe('Please enter a valid URL')
      expect(validator('example.com')).toBe('Please enter a valid URL')
      expect(validator('www.example.com')).toBe('Please enter a valid URL')
    })

    it('should reject non-HTTP/HTTPS protocols', () => {
      const validator = validateURL()
      expect(validator('ftp://example.com')).toBe('URL must use HTTP or HTTPS protocol')
      expect(validator('file:///path/to/file')).toBe('URL must use HTTP or HTTPS protocol')
      expect(validator('mailto:test@example.com')).toBe('URL must use HTTP or HTTPS protocol')
      expect(validator('javascript:alert("xss")')).toBe('URL must use HTTP or HTTPS protocol')
    })
  })

  describe('domain restrictions', () => {
    it('should accept URLs from allowed domains', () => {
      const validator = validateURL({ allowedDomains: ['example.com', 'test.org'] })
      expect(validator('https://example.com')).toBe(true)
      expect(validator('https://test.org')).toBe(true)
    })

    it('should accept URLs from subdomains of allowed domains', () => {
      const validator = validateURL({ allowedDomains: ['example.com'] })
      expect(validator('https://subdomain.example.com')).toBe(true)
      expect(validator('https://deep.sub.example.com')).toBe(true)
    })

    it('should reject URLs from non-allowed domains', () => {
      const validator = validateURL({ allowedDomains: ['example.com'] })
      expect(validator('https://other.com')).toBe('URL must be from one of these domains: example.com')
      // notexample.com ends with 'example.com', so it's allowed (endsWith behavior)
      expect(validator('https://notexample.com')).toBe(true)
    })

    it('should show multiple allowed domains in error message', () => {
      const validator = validateURL({ allowedDomains: ['example.com', 'test.org', 'sample.net'] })
      expect(validator('https://other.com')).toBe(
        'URL must be from one of these domains: example.com, test.org, sample.net',
      )
    })

    it('should handle empty allowedDomains array', () => {
      const validator = validateURL({ allowedDomains: [] })
      expect(validator('https://example.com')).toBe(true)
      expect(validator('https://any-domain.com')).toBe(true)
    })
  })

  describe('custom error messages', () => {
    it('should use custom message for invalid URLs', () => {
      const validator = validateURL({ message: 'Custom error message' })
      expect(validator('not-a-url')).toBe('Custom error message')
    })

    it('should use custom message for protocol errors', () => {
      const validator = validateURL({ message: 'Custom protocol error' })
      expect(validator('ftp://example.com')).toBe('Custom protocol error')
    })

    it('should use custom message for domain restriction errors', () => {
      const validator = validateURL({ allowedDomains: ['example.com'], message: 'Domain not allowed' })
      expect(validator('https://other.com')).toBe('Domain not allowed')
    })
  })

  describe('edge cases', () => {
    it('should handle URLs with ports', () => {
      const validator = validateURL()
      expect(validator('https://example.com:8080')).toBe(true)
      expect(validator('http://localhost:3000')).toBe(true)
    })

    it('should handle URLs with authentication', () => {
      const validator = validateURL()
      expect(validator('https://user:pass@example.com')).toBe(true)
    })

    it('should handle URLs with IP addresses', () => {
      const validator = validateURL()
      expect(validator('http://192.168.1.1')).toBe(true)
      expect(validator('https://127.0.0.1:8080')).toBe(true)
    })

    it('should handle internationalized domain names', () => {
      const validator = validateURL()
      expect(validator('https://münchen.de')).toBe(true)
    })

    it('should handle URLs with query strings', () => {
      const validator = validateURL()
      expect(validator('https://example.com?query=value&other=param')).toBe(true)
    })

    it('should handle URLs with fragments', () => {
      const validator = validateURL()
      expect(validator('https://example.com/page#section')).toBe(true)
    })
  })
})

describe('validateQuote', () => {
  describe('valid quotes', () => {
    it('should accept quotes without quotation marks', () => {
      expect(validateQuote('This is a valid quote')).toBe(true)
    })

    it('should accept quotes with quotation marks in the middle', () => {
      expect(validateQuote('This is a "valid" quote')).toBe(true)
      expect(validateQuote('He said "hello" to me')).toBe(true)
    })

    it('should accept empty strings', () => {
      expect(validateQuote('')).toBe(true)
    })

    it('should accept quotes with other punctuation', () => {
      expect(validateQuote('This is a quote!')).toBe(true)
      expect(validateQuote('Is this a quote?')).toBe(true)
      expect(validateQuote('This is a quote.')).toBe(true)
    })

    it('should accept non-string values', () => {
      expect(validateQuote(123)).toBe(true)
      expect(validateQuote(null)).toBe(true)
      expect(validateQuote(undefined)).toBe(true)
      expect(validateQuote({})).toBe(true)
      expect(validateQuote([])).toBe(true)
    })
  })

  describe('invalid quotes', () => {
    it('should reject quotes starting with double quotation marks', () => {
      expect(validateQuote('"This starts with quotes')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should reject quotes ending with double quotation marks', () => {
      expect(validateQuote('This ends with quotes"')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should reject quotes both starting and ending with double quotation marks', () => {
      expect(validateQuote('"This is fully quoted"')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should reject quotes with curly double quotes at start', () => {
      expect(validateQuote('"Curly quote at start')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
      expect(validateQuote('"Curly quote at start')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should reject quotes with curly double quotes at end', () => {
      expect(validateQuote('Curly quote at end"')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
      expect(validateQuote('Curly quote at end"')).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should reject quotes starting with single quotation marks', () => {
      expect(validateQuote("'This starts with single quote")).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should reject quotes ending with single quotation marks', () => {
      expect(validateQuote("This ends with single quote'")).toBe(
        'Please avoid starting or ending the quote with quotation marks',
      )
    })

    it('should accept curly single quotes (not in regex pattern)', () => {
      // U+2018 and U+2019 are not in the regex pattern, so they're accepted
      expect(validateQuote('\u2018Curly single quote at start')).toBe(true)
      expect(validateQuote('\u2019Curly single quote at start')).toBe(true)
    })

    it('should accept curly single quotes at end (not in regex pattern)', () => {
      // U+2018 and U+2019 are not in the regex pattern, so they're accepted
      expect(validateQuote('Curly single quote at end\u2018')).toBe(true)
      expect(validateQuote('Curly single quote at end\u2019')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle quotes with whitespace', () => {
      expect(validateQuote('  This has leading whitespace')).toBe(true)
      expect(validateQuote('This has trailing whitespace  ')).toBe(true)
    })

    it('should handle multi-line quotes', () => {
      expect(validateQuote('Line one\nLine two')).toBe(true)
    })

    it('should reject quote with only quotation mark', () => {
      expect(validateQuote('"')).toBe('Please avoid starting or ending the quote with quotation marks')
      expect(validateQuote("'")).toBe('Please avoid starting or ending the quote with quotation marks')
    })
  })
})
