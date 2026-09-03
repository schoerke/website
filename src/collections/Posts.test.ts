// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

// Test the normalizedContent hook logic directly (extracted for testability)
import { extractLexicalText } from '@/utils/search/extractLexicalText'
import { normalizeText } from '@/utils/search/normalizeText'

import { Posts, validatePublishedPostContent } from './Posts'

const validContent = {
  root: {
    children: [
      {
        children: [{ text: 'Opening', type: 'text' }],
        type: 'paragraph',
      },
    ],
  },
}

const validLeadingBlock = {
  root: {
    children: [
      {
        fields: { blockType: 'eventDates' },
        type: 'block',
      },
      {
        children: [{ text: 'Text', type: 'text' }],
        type: 'paragraph',
      },
    ],
  },
}

const emptyParagraphContent = {
  root: {
    children: [
      {
        children: [],
        type: 'paragraph',
      },
    ],
  },
}

const emptyTextParagraphContent = {
  root: {
    children: [
      {
        children: [{ text: '', type: 'text' }],
        type: 'paragraph',
      },
    ],
  },
}

const twoEmptyTextChildrenParagraphContent = {
  root: {
    children: [
      {
        children: [
          { text: '', type: 'text' },
          { text: '', type: 'text' },
        ],
        type: 'paragraph',
      },
    ],
  },
}

type RealPublishedContentValidationOptions = Parameters<typeof validatePublishedPostContent>[1]

function validationOptions(
  editorResult: true | string = true,
  data: { _status?: string } = {},
  locale?: 'de' | 'en'
): {
  editorValidate: ReturnType<typeof vi.fn>
  options: RealPublishedContentValidationOptions
} {
  const editorValidate = vi
    .fn()
    .mockImplementation((value) => Promise.resolve(isEmptyRichText(value) ? 'Required' : editorResult))
  // Test-only mock: the real options object is Payload's full `BaseValidateOptions` (req, path,
  // data, siblingData, operation, etc) plus a full `RichTextAdapter` editor (CellComponent,
  // FieldComponent, etc). `validatePublishedPostContent` only reads `options.editor.validate`,
  // `options.data._status`, and `options.req.locale`, and forwards `options` unchanged, so the
  // mock intentionally omits the rest.
  const options = {
    data,
    editor: { validate: editorValidate },
    req: { locale },
    required: true,
  } as unknown as RealPublishedContentValidationOptions
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

describe('Posts content validation', () => {
  it('keeps standard field validation enabled when saving drafts', () => {
    const drafts = Posts.versions && typeof Posts.versions === 'object' ? Posts.versions.drafts : undefined

    expect(drafts && typeof drafts === 'object' ? drafts.validate : undefined).toBe(true)
  })

  it('registers the post content warning editor feature without a custom field', () => {
    const content = Posts.fields?.find((field) => 'name' in field && field.name === 'content')

    expect(content).not.toMatchObject({ admin: { components: { Field: expect.anything() } } })
    expect(content).toMatchObject({ editor: expect.any(Function) })
  })

  it('routes missing content through Payload required validation', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedPostContent(undefined, options)).resolves.toBe('Required')
    expect(editorValidate).toHaveBeenCalledWith(undefined, options)
  })

  it('routes canonical empty rich text through Payload required validation', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedPostContent(emptyParagraphContent, options)).resolves.toBe('Required')
    expect(editorValidate).toHaveBeenCalledWith(emptyParagraphContent, options)
  })

  it('routes a single empty text child through Payload required validation', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedPostContent(emptyTextParagraphContent, options)).resolves.toBe('Required')
    expect(editorValidate).toHaveBeenCalledWith(emptyTextParagraphContent, options)
  })

  it('routes a paragraph with multiple empty text children through Payload required validation', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedPostContent(twoEmptyTextChildrenParagraphContent, options)).resolves.toBe('Required')
    expect(editorValidate).toHaveBeenCalledWith(twoEmptyTextChildrenParagraphContent, options)
  })

  it('returns the server malformed message before Lexical validation', async () => {
    const { editorValidate, options } = validationOptions()
    const malformedContent = { root: { children: [null] } }

    await expect(validatePublishedPostContent(malformedContent, options)).resolves.toBe('Post content is invalid.')
    expect(editorValidate).not.toHaveBeenCalled()
  })

  it('rejects malformed descendants before Lexical validation', async () => {
    const { editorValidate, options } = validationOptions()
    const malformedContent = {
      root: {
        children: [{ children: [{ text: 'Opening', type: 'text' }, null], type: 'paragraph' }],
      },
    }

    await expect(validatePublishedPostContent(malformedContent, options)).resolves.toBe('Post content is invalid.')
    expect(editorValidate).not.toHaveBeenCalled()
  })

  it('returns semantic server messages after Lexical validation', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedPostContent(validLeadingBlock, options)).resolves.toBe(
      'Start the post with text, not an embed block.'
    )
    expect(editorValidate).toHaveBeenCalledWith(validLeadingBlock, options)
  })

  it('returns German semantic server messages for a German request locale', async () => {
    const { options } = validationOptions(true, {}, 'de')

    await expect(validatePublishedPostContent(validLeadingBlock, options)).resolves.toBe(
      'Der Beitrag muss mit Text beginnen, nicht mit einem Einbettungsblock.'
    )
  })

  it('returns Lexical validation errors before semantic structural errors', async () => {
    const { options } = validationOptions('block node failed to validate: event dates')

    await expect(validatePublishedPostContent(validLeadingBlock, options)).resolves.toBe(
      'block node failed to validate: event dates'
    )
  })

  it.each([
    [
      'Event Dates',
      {
        root: {
          children: [
            { children: [{ text: 'Opening', type: 'text' }], type: 'paragraph' },
            { fields: { blockType: 'eventDates', events: [] }, type: 'block' },
          ],
        },
      },
      'block node failed to validate: events: At least one event is required',
    ],
    [
      'video embed',
      {
        root: {
          children: [
            { children: [{ text: 'Opening', type: 'text' }], type: 'paragraph' },
            { fields: { blockType: 'videoEmbed', url: 'https://example.com/video' }, type: 'block' },
          ],
        },
      },
      'block node failed to validate: url: Enter a valid video URL',
    ],
    [
      'audio embed',
      {
        root: {
          children: [
            { children: [{ text: 'Opening', type: 'text' }], type: 'paragraph' },
            {
              fields: { blockType: 'audioEmbed', embedCode: '<iframe src="https://example.com"></iframe>' },
              type: 'block',
            },
          ],
        },
      },
      'block node failed to validate: embedCode: Enter a valid embed code',
    ],
  ])('preserves editor validation for invalid %s block JSON', async (_, content, editorError) => {
    const { editorValidate, options } = validationOptions(editorError)

    await expect(validatePublishedPostContent(content, options)).resolves.toBe(editorError)
    expect(editorValidate).toHaveBeenCalledWith(content, options)
  })

  it('accepts well-shaped content when Lexical validation succeeds', async () => {
    const { editorValidate, options } = validationOptions()

    await expect(validatePublishedPostContent(validContent, options)).resolves.toBe(true)
    expect(editorValidate).toHaveBeenCalledWith(validContent, options)
  })

  it('bypasses all content validation when saving a draft, even with malformed content', async () => {
    const malformedContent = { root: { children: [null] } }
    const { editorValidate, options } = validationOptions(true, { _status: 'draft' })

    await expect(validatePublishedPostContent(malformedContent, options)).resolves.toBe(true)
    await expect(validatePublishedPostContent(undefined, options)).resolves.toBe(true)
    await expect(validatePublishedPostContent(validLeadingBlock, options)).resolves.toBe(true)
    expect(editorValidate).not.toHaveBeenCalled()
  })

  it('runs full validation when publishing, even when data carries a prior draft status field', async () => {
    const { editorValidate, options } = validationOptions(true, { _status: 'published' })

    await expect(validatePublishedPostContent(validLeadingBlock, options)).resolves.toBe(
      'Start the post with text, not an embed block.'
    )
    expect(editorValidate).toHaveBeenCalledWith(validLeadingBlock, options)
  })
})

function runNormalizedContentHook(siblingData: { content?: unknown }): string {
  return siblingData.content
    ? normalizeText(extractLexicalText(siblingData.content as Parameters<typeof extractLexicalText>[0]))
    : ''
}

describe('normalizedContent hook', () => {
  it('returns empty string when content is undefined', () => {
    expect(runNormalizedContentHook({})).toBe('')
  })

  it('returns empty string when content is null', () => {
    expect(runNormalizedContentHook({ content: null })).toBe('')
  })

  it('extracts and normalizes plain text from Lexical JSON', () => {
    const lexicalContent = {
      root: {
        children: [
          {
            children: [{ text: 'Müller spielt Violine', type: 'text', version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }

    const result = runNormalizedContentHook({ content: lexicalContent })
    // normalizeText strips diacritics and lowercases
    expect(result).toBe('muller spielt violine')
  })

  it('handles empty Lexical document', () => {
    const emptyContent = {
      root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }

    const result = runNormalizedContentHook({ content: emptyContent })
    expect(result).toBe('')
  })
})
