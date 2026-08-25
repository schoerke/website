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
    it('should transliterate German umlauts', () => {
      expect(generateSlug('Künstler')).toBe('kuenstler')
      expect(generateSlug('Über')).toBe('ueber')
      expect(generateSlug('Schön')).toBe('schoen')
      expect(generateSlug('Straße')).toBe('strasse')
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
      expect(generateSlug('Künstler Konzert über Música')).toBe('kuenstler-konzert-ueber-musica')
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

    it('should convert slashes to hyphens', () => {
      expect(generateSlug('2026/27')).toBe('2026-27')
      expect(generateSlug('Season Programs 2026/27')).toBe('season-programs-2026-27')
      expect(generateSlug('Saisonprogramme 2027/2028')).toBe('saisonprogramme-2027-2028')
      expect(generateSlug('2026/27/')).toBe('2026-27')
      expect(generateSlug('/2026')).toBe('2026')
      expect(generateSlug('2026//27')).toBe('2026-27')
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
      expect(generateSlug('Konzert für Klavier und Orchester')).toBe('konzert-fuer-klavier-und-orchester')
      expect(generateSlug('Symphony No. 5 in C Minor')).toBe('symphony-no-5-in-c-minor')
    })

    it('should handle post titles', () => {
      expect(generateSlug('Neuer Künstler im Team!')).toBe('neuer-kuenstler-im-team')
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
    it('should regenerate slug on draft when title changed', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: 'old-title',
        originalDoc: { title: 'Old Title', slug: 'old-title', _status: 'draft' },
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('new-title')
    })

    it('should regenerate slug from the full title on a draft, not a stale partial value', () => {
      // Regression: autosave captured an early partial title ("v") and froze the slug.
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'Das Trio Gaspard zurück in Ernen' },
        operation: 'update',
        value: 'v',
        originalDoc: { title: 'v', slug: 'v', _status: 'draft' },
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('das-trio-gaspard-zurueck-in-ernen')
    })

    it('should keep slug stable on update when title did not change', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'Same Title', content: 'edited body' },
        operation: 'update',
        value: 'same-title',
        originalDoc: { title: 'Same Title', slug: 'same-title', _status: 'draft' },
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('same-title')
    })

    it('should keep slug stable on a published post when title changes', () => {
      // Published posts should not be renamed — protects existing URLs.
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: 'old-title',
        originalDoc: { title: 'Old Title', slug: 'old-title', _status: 'published' },
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('old-title')
    })

    it('should keep slug stable on a doc without drafts when title changes', () => {
      // Collections without drafts (no _status) never regenerate on update.
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'New Title' },
        operation: 'update',
        value: 'old-title',
        originalDoc: { title: 'Old Title', slug: 'old-title' },
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('old-title')
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
      expect(result).toBe('neuer-kuenstler')
    })

    it('should regenerate slug from updated title when editing a draft', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: 'Updated Title' },
        operation: 'update',
        value: 'original-slug',
        originalDoc: { title: 'Original Title', slug: 'original-slug', _status: 'draft' },
      } as Partial<FieldHookArgs> as FieldHookArgs)
      expect(result).toBe('updated-title')
    })
  })

  describe('length cap', () => {
    const longTitle =
      'Dominik Wagner im Concertgebouw Amsterdam diese Woche wird Dominik Wagner gemeinsam mit dem Simply ' +
      'Quartett und Pianist Johannes Piirto im renommierten Concertgebouw in Amsterdam spielen gemeinsam werden ' +
      'die sechs Musikerinnen Schuberts Forellenquintett präsentieren siebenter Mai zweitausendsechsundzwanzig ' +
      'Amsterdam'

    it('keeps slugs within the filesystem-safe byte limit', () => {
      const result = generateSlug(longTitle)

      expect(Buffer.byteLength(result)).toBeLessThanOrEqual(240)
    })

    it('appends a deterministic hash suffix when truncating', () => {
      const result = generateSlug(longTitle)
      const again = generateSlug(longTitle)

      expect(result).toMatch(/^.{1,231}-[a-f0-9]{8}$/)
      expect(result).toBe(again)
      expect(result).not.toContain('--')
      expect(result).not.toBe(generateSlug('Christian Poltéra'))
    })

    it('keeps truncated slugs unique when titles share a long prefix', () => {
      const commonPrefix = 'a'.repeat(231)
      const first = `${commonPrefix} first title with a unique ending`
      const second = `${commonPrefix} another title with a different ending`

      const slugA = generateSlug(first)
      const slugB = generateSlug(second)

      expect(slugA).not.toBe(slugB)
      expect(Buffer.byteLength(slugA)).toBeLessThanOrEqual(240)
      expect(Buffer.byteLength(slugB)).toBeLessThanOrEqual(240)
      expect(slugA).toHaveLength(slugB.length)
    })

    it('leaves short slugs untouched', () => {
      expect(generateSlug('Christian Poltéra')).toBe('christian-poltera')
      expect(generateSlug('Neuer Künstler')).toBe('neuer-kuenstler')
    })

    it('keeps a slug exactly at the boundary unchanged', () => {
      const boundary = 'a'.repeat(240)

      expect(generateSlug(boundary)).toBe(boundary)
    })

    it('capped slug resolves to the same result through the createSlugHook', () => {
      const hook = createSlugHook('title')
      const result = hook({
        data: { title: { de: longTitle } },
        operation: 'create',
        value: undefined,
        req: { locale: 'de' },
      } as unknown as FieldHookArgs)

      expect(typeof result).toBe('string')
      expect(Buffer.byteLength(result as string)).toBeLessThanOrEqual(240)
    })
  })
})
