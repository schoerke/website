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
