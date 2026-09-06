import { describe, expect, it, vi } from 'vitest'

import { Artists, validatePublishedArtistBiography } from './Artists'

type RealBiographyValidationOptions = Parameters<typeof validatePublishedArtistBiography>[1]

function validationOptions(
  editorResult: true | string = true,
  locale?: 'de' | 'en',
  required = false
): {
  editorValidate: ReturnType<typeof vi.fn>
  options: RealBiographyValidationOptions
} {
  const editorValidate = vi
    .fn()
    .mockImplementation((value) =>
      Promise.resolve(isEmptyRichText(value) ? (required ? 'Required' : true) : editorResult)
    )
  const options = {
    data: {},
    editor: { validate: editorValidate },
    req: { locale },
    required,
  } as unknown as RealBiographyValidationOptions
  return { editorValidate, options }
}

function isEmptyRichText(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value !== 'object' || !('root' in value) || typeof value.root !== 'object' || value.root === null) {
    return false
  }
  if (!('children' in value.root) || !Array.isArray(value.root.children)) return false

  const { children } = value.root
  if (children.length === 0) return true
  if (children.length !== 1) return false

  const [firstChild] = children
  if (
    typeof firstChild !== 'object' ||
    firstChild === null ||
    !('type' in firstChild) ||
    firstChild.type !== 'paragraph' ||
    !('children' in firstChild) ||
    !Array.isArray(firstChild.children)
  ) {
    return false
  }

  return firstChild.children.every(
    (paragraphChild: unknown) =>
      typeof paragraphChild === 'object' &&
      paragraphChild !== null &&
      'type' in paragraphChild &&
      paragraphChild.type === 'text' &&
      'text' in paragraphChild &&
      typeof paragraphChild.text === 'string' &&
      paragraphChild.text.length === 0
  )
}

function getBiographyField(): { type: 'richText'; editor?: unknown; validate?: unknown; name?: string } {
  const tabs = Artists.fields?.find((field) => field.type === 'tabs')
  const biographyTab = tabs?.tabs?.find(
    (tab) => typeof tab.label === 'object' && tab.label !== null && 'de' in tab.label && tab.label.de === 'Biographie'
  )
  const fields = biographyTab?.fields ?? []
  const field = fields.find((candidate) => 'name' in candidate && candidate.name === 'biography')

  if (!field || field.type !== 'richText') throw new Error('Artists.biography rich text field is missing')

  return field
}

describe('Artists', () => {
  it('defines a localized optional quote source below the quote field', () => {
    const tabs = Artists.fields?.find((field) => field.type === 'tabs')
    const biographyTab = tabs?.tabs?.find(
      (tab) => typeof tab.label === 'object' && tab.label !== null && 'de' in tab.label && tab.label.de === 'Biographie'
    )
    const fields = biographyTab?.fields ?? []
    const quoteIndex = fields.findIndex((field) => 'name' in field && field.name === 'quote')
    const quoteSource = fields[quoteIndex + 1]

    expect(quoteIndex).toBeGreaterThanOrEqual(0)
    expect(fields[quoteIndex]).toMatchObject({
      admin: { components: { Field: '/components/admin/QuoteField' } },
      name: 'quote',
    })
    expect(quoteSource).toMatchObject({
      name: 'quoteSource',
      type: 'text',
      localized: true,
      required: false,
      label: { de: 'Zitatquelle', en: 'Quote source' },
    })
  })

  it('registers a validated biography rich text field with warning + blocks editor features', () => {
    const biography = getBiographyField()

    expect(biography).toMatchObject({
      name: 'biography',
      type: 'richText',
      required: true,
      localized: true,
      editor: expect.any(Function),
      validate: expect.any(Function),
    })
    expect(typeof validatePublishedArtistBiography).toBe('function')
  })

  describe('validatePublishedArtistBiography', () => {
    const validContent = {
      root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Opening' }] }] },
    }
    const validWithPerformersList = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Intro' }] },
          { type: 'block', fields: { blockType: 'performersList', id: '1' } },
        ],
      },
    }
    const invalidLeadingBlock = {
      root: {
        children: [
          { type: 'block', fields: { blockType: 'videoEmbed', id: '1' } },
          { type: 'paragraph', children: [{ type: 'text', text: 'Text' }] },
        ],
      },
    }
    const malformedContent = { root: { children: [null] } }

    it('routes an empty string through Payload validation without a required error', async () => {
      const { editorValidate, options } = validationOptions()

      await expect(
        validatePublishedArtistBiography(
          '' as unknown as Parameters<typeof validatePublishedArtistBiography>[0],
          options
        )
      ).resolves.toBe(true)
      expect(editorValidate).toHaveBeenCalledWith('', options)
    })

    it('routes missing content through Payload validation without a required error', async () => {
      const { editorValidate, options } = validationOptions()

      await expect(validatePublishedArtistBiography(undefined, options)).resolves.toBe(true)
      expect(editorValidate).toHaveBeenCalledWith(undefined, options)
    })

    it('returns the server malformed message before Lexical validation', async () => {
      const { editorValidate, options } = validationOptions()

      await expect(validatePublishedArtistBiography(malformedContent, options)).resolves.toBe('Biography is invalid.')
      expect(editorValidate).not.toHaveBeenCalled()
    })

    it('returns the semantic media message after Lexical validation', async () => {
      const { editorValidate, options } = validationOptions()

      await expect(validatePublishedArtistBiography(invalidLeadingBlock, options)).resolves.toBe(
        'The biography cannot contain images or embedded media.'
      )
      expect(editorValidate).toHaveBeenCalledWith(invalidLeadingBlock, options)
    })

    it('returns German semantic messages for a German request locale', async () => {
      const { options } = validationOptions(true, 'de')

      await expect(validatePublishedArtistBiography(invalidLeadingBlock, options)).resolves.toBe(
        'Die Biographie darf keine Bilder oder eingebetteten Medien enthalten.'
      )
    })

    it('falls back to English messages for a non-German locale', async () => {
      const { options } = validationOptions(true, undefined)

      await expect(validatePublishedArtistBiography(invalidLeadingBlock, options)).resolves.toBe(
        'The biography cannot contain images or embedded media.'
      )
    })

    it('returns Lexical validation errors before semantic structural errors', async () => {
      const { options } = validationOptions('block node failed to validate: video embed')

      await expect(validatePublishedArtistBiography(invalidLeadingBlock, options)).resolves.toBe(
        'block node failed to validate: video embed'
      )
    })

    it('accepts well-shaped content when Lexical validation succeeds', async () => {
      const { editorValidate, options } = validationOptions()

      await expect(validatePublishedArtistBiography(validContent, options)).resolves.toBe(true)
      expect(editorValidate).toHaveBeenCalledWith(validContent, options)
    })

    it('accepts a PerformersList block when Lexical validation succeeds', async () => {
      const { editorValidate, options } = validationOptions()

      await expect(validatePublishedArtistBiography(validWithPerformersList, options)).resolves.toBe(true)
      expect(editorValidate).toHaveBeenCalledWith(validWithPerformersList, options)
    })
  })
})
