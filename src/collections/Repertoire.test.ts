// @vitest-environment node

import type { BlocksFeatureProps, LexicalEditorProps } from '@payloadcms/richtext-lexical'
import { describe, expect, it, vi } from 'vitest'

const { blocksFeatureCalls } = vi.hoisted(() => ({
  blocksFeatureCalls: [] as BlocksFeatureProps[],
}))

vi.mock('@payloadcms/richtext-lexical', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@payloadcms/richtext-lexical')>()

  return {
    ...actual,
    BlocksFeature: (props: BlocksFeatureProps) => {
      blocksFeatureCalls.push(props)
      return actual.BlocksFeature(props)
    },
    lexicalEditor: (args?: LexicalEditorProps) => {
      if (typeof args?.features === 'function') {
        args.features({ defaultFeatures: [], rootFeatures: [] })
      }
      return actual.lexicalEditor(args)
    },
  }
})

import { Repertoire } from './Repertoire'

describe('Repertoire content editor', () => {
  it('registers PerformersList in its block editor feature', () => {
    expect(Repertoire.slug).toBe('repertoire')
    expect(blocksFeatureCalls).toContainEqual({
      blocks: expect.arrayContaining([expect.objectContaining({ slug: 'performersList' })]),
    })
  })
})

describe('Repertoire artists field validation', () => {
  const artistsField = Repertoire.fields.find(
    (field): field is Extract<(typeof Repertoire.fields)[number], { name: string }> =>
      'name' in field && field.name === 'artists'
  )

  if (!artistsField || !('validate' in artistsField) || typeof artistsField.validate !== 'function') {
    throw new Error('Repertoire "artists" field or its validate function could not be found')
  }

  const validate = artistsField.validate as (
    value: unknown,
    options: { req: { payload: { findByID: (args: unknown) => Promise<unknown> } }; id?: number | string }
  ) => Promise<true | string>

  function makeReq(findByIdResult: unknown) {
    return { payload: { findByID: async () => findByIdResult } }
  }

  it('allows renaming (re-saving) an existing repertoire list that is already one of the artist’s 5 lists', async () => {
    // Artist already has exactly 5 repertoire lists, and this repertoire doc (id 42) is one of them.
    const req = makeReq({ name: 'Christian Zacharias', repertoire: [1, 2, 3, 4, 42] })

    const result = await validate([1], { req, id: 42 })

    expect(result).toBe(true)
  })

  it('rejects adding a repertoire list to an artist who already has 5 OTHER lists', async () => {
    // A brand-new repertoire doc (no id yet) tries to link to an artist who already has 5 lists.
    const req = makeReq({ name: 'Christian Zacharias', repertoire: [1, 2, 3, 4, 5] })

    const result = await validate([1], { req, id: undefined })

    expect(result).toBe('"Christian Zacharias" already has 5 repertoire lists. Remove a list before adding more.')
  })

  it('rejects linking an existing repertoire doc to an artist who already has 5 OTHER lists (not counting this doc)', async () => {
    // Repertoire doc 99 is not currently one of the artist's 5 lists, so adding it should still be rejected.
    const req = makeReq({ name: 'Christian Zacharias', repertoire: [1, 2, 3, 4, 5] })

    const result = await validate([1], { req, id: 99 })

    expect(result).toBe('"Christian Zacharias" already has 5 repertoire lists. Remove a list before adding more.')
  })

  it('allows adding a repertoire list to an artist with fewer than 5 lists', async () => {
    const req = makeReq({ name: 'Christian Zacharias', repertoire: [1, 2, 3] })

    const result = await validate([1], { req, id: undefined })

    expect(result).toBe(true)
  })

  it('evaluates each linked artist independently when multiple artists are linked at once', async () => {
    const findByID = vi.fn(async (args: unknown) =>
      (args as { id: number }).id === 1
        ? { name: 'Full Artist', repertoire: [10, 20, 30, 40, 50] }
        : { name: 'Open Artist', repertoire: [10] }
    )
    const req = { payload: { findByID } }

    const result = await validate([1, 2], { req, id: undefined })

    expect(result).toBe('"Full Artist" already has 5 repertoire lists. Remove a list before adding more.')
    expect(findByID).toHaveBeenCalledTimes(1) // stops at the first artist over the limit
  })
})
