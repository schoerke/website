import { describe, expect, it } from 'vitest'

import { artistBiographyMessages, validateArtistBiography, validateArtistBiographyErrors } from './artistBiography'

const paragraph = (text: string) => ({ type: 'paragraph', children: [{ type: 'text', text }] })
const content = (...children: unknown[]) => ({ root: { children } })

const performersListBlock = (blockType: 'performersList' | 'videoEmbed' | 'audioEmbed' = 'performersList') => ({
  type: 'block',
  fields: { blockType, id: '1' },
})

describe('validateArtistBiography', () => {
  it('accepts text-first content with a non-empty final paragraph', () => {
    expect(validateArtistBiography(content(paragraph('Opening'), paragraph('Closing')))).toBe(true)
  })

  it('rejects missing or empty editor state', () => {
    expect(validateArtistBiography(undefined)).toBe('malformed')
    expect(validateArtistBiography({})).toBe('malformed')
    expect(validateArtistBiography({ root: null })).toBe('malformed')
    expect(validateArtistBiography({ root: { children: [] } })).toBe('malformed')
  })

  it('rejects malformed non-empty editor state without throwing', () => {
    expect(validateArtistBiography({ root: { children: [null] } })).toBe('malformed')
    expect(validateArtistBiography(content({ type: 1 }, paragraph('Text')))).toBe('malformed')
  })

  it('allows a PerformersList block anywhere in the biography', () => {
    expect(
      validateArtistBiography(content(paragraph('Intro'), performersListBlock('performersList'), paragraph('Outro')))
    ).toBe(true)
    expect(validateArtistBiography(content(paragraph('Intro'), performersListBlock('performersList')))).toBe(true)
  })

  it('rejects an upload or relationship node anywhere', () => {
    expect(validateArtistBiography(content(paragraph('Intro'), { type: 'upload', fields: { id: '1' } }))).toBe(
      'mediaNode'
    )
    expect(validateArtistBiography(content(paragraph('Intro'), { type: 'relationship', fields: { id: '1' } }))).toBe(
      'mediaNode'
    )
  })

  it('rejects any block other than PerformersList', () => {
    expect(validateArtistBiography(content(paragraph('Intro'), performersListBlock('videoEmbed')))).toBe('mediaNode')
    expect(validateArtistBiography(content(paragraph('Intro'), performersListBlock('audioEmbed')))).toBe('mediaNode')
  })

  it('rejects an empty first paragraph', () => {
    expect(validateArtistBiography(content(paragraph('  '), paragraph('Text')))).toBe('emptyFirstLine')
  })

  it('rejects an empty final paragraph', () => {
    expect(validateArtistBiography(content(paragraph('Text'), paragraph('\n  ')))).toBe('emptyTrailingParagraph')
  })

  it('uses recursively nested descendant text for the first top-level node', () => {
    expect(
      validateArtistBiography(
        content(
          { type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', text: 'Opening' }] }] },
          paragraph('Closing')
        )
      )
    ).toBe(true)
  })

  it('reports all errors for advisory UI display', () => {
    expect(
      validateArtistBiographyErrors(
        content(
          paragraph('  '),
          { type: 'upload', fields: { id: '1' } },
          performersListBlock('videoEmbed'),
          paragraph('\n')
        )
      )
    ).toEqual(['mediaNode', 'emptyFirstLine', 'emptyTrailingParagraph'])
  })

  it('exposes localized validation messages', () => {
    expect(artistBiographyMessages.de.malformed).toBeTruthy()
    expect(artistBiographyMessages.en.mediaNode).toBeTruthy()
  })
})
