import type { FieldHookArgs } from 'payload'
import { describe, expect, it } from 'vitest'
import { createSlugHook, generateSlug } from './slug'

describe('generateSlug', () => {
  describe('basic transformations', () => {
    it('should convert text to lowercase', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('UPPERCASE TEXT')).toBe('uppercase-text')
      expect(generateSlug('MiXeD CaSe')).toBe('mixed-case')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('multiple spaces here')).toBe('multiple-spaces-here')
      expect(generateSlug('single space')).toBe('single-space')
    })

    it('should replace multiple spaces with single hyphen', () => {
      expect(generateSlug('multiple   spaces')).toBe('multiple-spaces')
      expect(generateSlug('many     spaces')).toBe('many-spaces')
    })

    it('should trim leading and trailing spaces', () => {
      expect(generateSlug('  leading spaces')).toBe('leading-spaces')
      expect(generateSlug('trailing spaces  ')).toBe('trailing-spaces')
      expect(generateSlug('  both sides  ')).toBe('both-sides')
    })

    it('should replace multiple consecutive hyphens with single hyphen', () => {
      expect(generateSlug('test--slug')).toBe('test-slug')
      expect(generateSlug('test---slug')).toBe('test-slug')
      expect(generateSlug('multiple----hyphens')).toBe('multiple-hyphens')
    })
  })

  describe('diacritics removal', () => {
    it('should remove German umlauts', () => {
      expect(generateSlug('Künstler')).toBe('kunstler')
      expect(generateSlug('Über')).toBe('uber')
      expect(generateSlug('Schön')).toBe('schon')
    })

    it('should remove French accents', () => {
      expect(generateSlug('Café')).toBe('cafe')
      expect(generateSlug('Résumé')).toBe('resume')
      expect(generateSlug('Naïve')).toBe('naive')
    })

    it('should remove Spanish accents', () => {
      expect(generateSlug('Música')).toBe('musica')
      expect(generateSlug('Año')).toBe('ano')
      expect(generateSlug('José')).toBe('jose')
    })

    it('should handle mixed diacritics', () => {
      expect(generateSlug('Künstler Konzert über Música')).toBe('kunstler-konzert-uber-musica')
    })
  })

  describe('special characters', () => {
    it('should remove punctuation', () => {
      expect(generateSlug('Hello, World!')).toBe('hello-world')
      expect(generateSlug('Test? Yes.')).toBe('test-yes')
      expect(generateSlug('Email: test@example.com')).toBe('email-testexamplecom')
    })

    it('should remove parentheses and brackets', () => {
      expect(generateSlug('Test (parentheses)')).toBe('test-parentheses')
      expect(generateSlug('Test [brackets]')).toBe('test-brackets')
      expect(generateSlug('Test {braces}')).toBe('test-braces')
    })

    it('should remove quotes', () => {
      expect(generateSlug('Test "quotes"')).toBe('test-quotes')
      expect(generateSlug("Test 'single quotes'")).toBe('test-single-quotes')
    })

    it('should preserve numbers', () => {
      expect(generateSlug('Test 123')).toBe('test-123')
      expect(generateSlug('Year 2024')).toBe('year-2024')
      expect(generateSlug('Number 42')).toBe('number-42')
    })

    it('should preserve existing hyphens', () => {
      expect(generateSlug('pre-existing-slug')).toBe('pre-existing-slug')
      expect(generateSlug('multi-part-name')).toBe('multi-part-name')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('')
    })

    it('should handle string with only spaces', () => {
      expect(generateSlug('   ')).toBe('')
    })

    it('should handle string with only special characters', () => {
      expect(generateSlug('!!!')).toBe('')
      expect(generateSlug('@#$%')).toBe('')
    })

    it('should handle very long text', () => {
      const longText = 'This is a very long text that should be converted to a slug'.repeat(10)
      const result = generateSlug(longText)
      expect(result).toContain('this-is-a-very-long-text')
      expect(result).not.toContain(' ')
    })
  })

  describe('real-world examples', () => {
    it('should handle artist names', () => {
      expect(generateSlug('Christian Poltéra')).toBe('christian-poltera')
      expect(generateSlug('María José García')).toBe('maria-jose-garcia')
    })

    it('should handle concert titles', () => {
      expect(generateSlug('Konzert für Klavier und Orchester')).toBe('konzert-fur-klavier-und-orchester')
      expect(generateSlug('Symphony No. 5 in C Minor')).toBe('symphony-no-5-in-c-minor')
    })

    it('should handle post titles', () => {
      expect(generateSlug('Neuer Künstler im Team!')).toBe('neuer-kunstler-im-team')
      expect(generateSlug('Tournée 2024 – Alle Termine')).toBe('tournee-2024-alle-termine')
    })
  })
})

describe('createSlugHook', () => {
  describe('create operation', () => {
    it('should generate slug from string source field on create', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'Test Title' },
        operation: 'create',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('test-title')
    })

    it('should generate slug from localized source field on create', () => {
      const hook = createSlugHook('name')
      const result = hook({
        data: {
          name: {
            en: 'English Name',
            de: 'Deutscher Name',
          },
        },
        operation: 'create',
        value: undefined,
        req: { locale: 'de' },
      } as unknown as FieldHookArgs)
      expect(result).toBe('deutscher-name')
    })

    it('should handle missing locale in localized field', () => {
      const hook = createSlugHook('name')
      const result = hook({
        data: {
          name: {
            en: 'English Name',
          },
        },
        operation: 'create',
        value: undefined,
        req: { locale: 'de' },
      } as unknown as FieldHookArgs)
      // Returns undefined when locale doesn't exist
      expect(result).toBeUndefined()
    })

    it('should return undefined when source field is missing', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: {},
        operation: 'create',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBeUndefined()
    })

    it('should return undefined when source field is not a string', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 123 },
        operation: 'create',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBeUndefined()
    })

    it('should handle localized field with non-string value', () => {
      const hook = createSlugHook('name')
      const result = hook({
        data: {
          name: {
            en: 123, // Not a string
          },
        },
        operation: 'create',
        value: undefined,
        req: { locale: 'en' },
      } as unknown as FieldHookArgs)
      expect(result).toBeUndefined()
    })
  })

  describe('update operation', () => {
    it('should not generate slug on update if value exists', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: 'existing-slug',
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('existing-slug')
    })

    it('should generate slug on update if value is empty', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: '',
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('new-title')
    })

    it('should generate slug on update if value is undefined', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('new-title')
    })

    it('should generate slug on update if value is null', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: null,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('new-title')
    })
  })

  describe('edge cases', () => {
    it('should handle missing data', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: undefined,
        operation: 'create',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBeUndefined()
    })

    it('should handle missing req', () => {
      const hook = createSlugHook('name')
      const result = hook({
        data: {
          name: {
            en: 'English Name',
          },
        },
        operation: 'create',
        value: undefined,
        req: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      // Without req.locale, it can't extract localized value
      expect(result).toBeUndefined()
    })

    it('should handle empty string source value', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: '' },
        operation: 'create',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      // Returns undefined when source value is empty (falsy)
      expect(result).toBeUndefined()
    })
  })

  describe('real-world scenarios', () => {
    it('should generate slug for artist name', () => {
      const hook = createSlugHook('name')
      const result = hook({
        data: { name: 'Christian Poltéra' },
        operation: 'create',
        value: undefined,
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('christian-poltera')
    })

    it('should generate localized slug for post title', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: {
          title: {
            de: 'Neuer Künstler',
            en: 'New Artist',
          },
        },
        operation: 'create',
        value: undefined,
        req: { locale: 'de' },
      } as unknown as FieldHookArgs)
      expect(result).toBe('neuer-kunstler')
    })

    it('should preserve existing slug on update', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'Updated Title' },
        operation: 'update',
        value: 'original-slug',
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('original-slug')
    })
  })
})
