// @vitest-environment node

import type { RichTextField } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { Recordings, validatePublishedRecordingDescription } from './Recordings'

type RealPublishedDescriptionValidationOptions = Parameters<typeof validatePublishedRecordingDescription>[1]

function validationOptions(
  editorResult: true | string = true,
  data: { _status?: string } = {},
  locale?: 'de' | 'en',
  required = false
): {
  editorValidate: ReturnType<typeof vi.fn>
  options: RealPublishedDescriptionValidationOptions
} {
  const editorValidate = vi
    .fn()
    .mockImplementation((value) => Promise.resolve(isEmptyRichText(value) ? (required ? 'Required' : true) : editorResult))
  // Test-only mock: the real options object is Payload's full `BaseValidateOptions` plus a full
  // `RichTextAdapter` editor. `validatePublishedRecordingDescription` only reads
  // `options.editor.validate`, `options.data._status`, and `options.req.locale`, and forwards
  // `options` unchanged.
  const options = {
    data,
    editor: { validate: editorValidate },
    req: { locale },
    required,
  } as unknown as RealPublishedDescriptionValidationOptions
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

function getDescriptionField(): RichTextField {
  const field = Recordings.fields?.find((candidate) => 'name' in candidate && candidate.name === 'description')

  if (!field || field.type !== 'richText') throw new Error('Recordings.description rich text field is missing')

  return field
}

const emptyParagraphContent = { root: { children: [{ type: 'paragraph', children: [] }] } }
const validContent = {
  root: {
    children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Opening' }] }],
  },
}
const validLeadingBlock = {
  root: {
    children: [
      { type: 'block', fields: { blockType: 'videoEmbed' } },
      { type: 'paragraph', children: [{ type: 'text', text: 'Text' }] },
    ],
  },
}

describe('Recordings description validation', () => {
  it('keeps standard field validation enabled when saving drafts', () => {
    const drafts = Recordings.versions && typeof Recordings.versions === 'object' ? Recordings.versions.drafts : undefined

    expect(drafts && typeof drafts === 'object' ? drafts.validate : undefined).toBe(true)
  })

  it('registers the description warning editor feature', () => {
    const description = getDescriptionField()

    expect(description).toMatchObject({ editor: expect.any(Function) })
    expect(description).toMatchObject({ validate: expect.any(Function) })
  })

  it('routes an empty string through Payload validation without a required error', async () => {
    const { editorValidate, options } = validationOptions()

    // Payload types the field value as object, but runtime payloads can still carry '' — cast to
    // exercise the defensive empty-string branch.
    await expect(
      validatePublishedRecordingDescription('' as unknown as Parameters<typeof validatePublishedRecordingDescription>[0], options)
    ).resolves.toBe(true)
    expect(editorValidate).toHaveBeenCalledWith('', options)
  })

  it('routes missing content through Payload validation without a required error', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedRecordingDescription(undefined, options)).resolves.toBe(true)
    expect(editorValidate).toHaveBeenCalledWith(undefined, options)
  })

  it('routes canonical empty rich text through Payload validation without a required error', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedRecordingDescription(emptyParagraphContent, options)).resolves.toBe(true)
    expect(editorValidate).toHaveBeenCalledWith(emptyParagraphContent, options)
  })

  it('returns the server malformed message before Lexical validation', async () => {
    const { editorValidate, options } = validationOptions()
    const malformedContent = { root: { children: [null] } }

    await expect(validatePublishedRecordingDescription(malformedContent, options)).resolves.toBe(
      'Recording description is invalid.'
    )
    expect(editorValidate).not.toHaveBeenCalled()
  })

  it('returns semantic server messages after Lexical validation', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedRecordingDescription(validLeadingBlock, options)).resolves.toBe(
      'The description cannot contain images or embedded media.'
    )
    expect(editorValidate).toHaveBeenCalledWith(validLeadingBlock, options)
  })

  it('returns German semantic server messages for a German request locale', async () => {
    const { options } = validationOptions(true, {}, 'de')

    await expect(validatePublishedRecordingDescription(validLeadingBlock, options)).resolves.toBe(
      'Die Beschreibung darf keine Bilder oder eingebetteten Medien enthalten.'
    )
  })

  it('falls back to English messages for a non-German locale', async () => {
    const { options } = validationOptions(true, {}, undefined)

    await expect(validatePublishedRecordingDescription(validLeadingBlock, options)).resolves.toBe(
      'The description cannot contain images or embedded media.'
    )
  })

  it('routes published empty content through Payload validation without a required error', async () => {
    const { editorValidate, options } = validationOptions(true, { _status: 'published' })

    await expect(validatePublishedRecordingDescription(undefined, options)).resolves.toBe(true)
    expect(editorValidate).toHaveBeenCalledWith(undefined, options)
  })

  it('returns Lexical validation errors before semantic structural errors', async () => {
    const { options } = validationOptions('block node failed to validate: video embed')

    await expect(validatePublishedRecordingDescription(validLeadingBlock, options)).resolves.toBe(
      'block node failed to validate: video embed'
    )
  })

  it('accepts well-shaped content when Lexical validation succeeds', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedRecordingDescription(validContent, options)).resolves.toBe(true)
    expect(editorValidate).toHaveBeenCalledWith(validContent, options)
  })

  it('bypasses all content validation when saving a draft, even with malformed content', async () => {
    const malformedContent = { root: { children: [null] } }
    const { editorValidate, options } = validationOptions(true, { _status: 'draft' })

    await expect(validatePublishedRecordingDescription(malformedContent, options)).resolves.toBe(true)
    await expect(validatePublishedRecordingDescription(undefined, options)).resolves.toBe(true)
    await expect(validatePublishedRecordingDescription(validLeadingBlock, options)).resolves.toBe(true)
    expect(editorValidate).not.toHaveBeenCalled()
  })

  it('runs full validation when publishing, even when data carries a prior draft status field', async () => {
    const { editorValidate, options } = validationOptions(true, { _status: 'published' })

    await expect(validatePublishedRecordingDescription(validLeadingBlock, options)).resolves.toBe(
      'The description cannot contain images or embedded media.'
    )
    expect(editorValidate).toHaveBeenCalledWith(validLeadingBlock, options)
  })
})