// @vitest-environment node

import type { BlocksFeatureProps, LexicalEditorProps } from '@payloadcms/richtext-lexical'
import { describe, expect, it, vi } from 'vitest'

const { blocksFeatureCalls, editorFeatureCalls } = vi.hoisted(() => ({
  blocksFeatureCalls: [] as BlocksFeatureProps[],
  editorFeatureCalls: [] as unknown[][],
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
        editorFeatureCalls.push(args.features({ defaultFeatures: [], rootFeatures: [] }))
      }
      return actual.lexicalEditor(args)
    },
  }
})

import { ArtistBiographyWarningFeature } from '@/features/artistBiographyWarning/feature.server'
import { PerformersListConversionFeature } from '@/features/performersListConverter/feature.server'

import { Artists } from './Artists'

describe('Artists biography editor', () => {
  it('registers PerformersList block and converter + warning features in the biography editor', () => {
    expect(Artists.slug).toBe('artists')

    expect(blocksFeatureCalls).toContainEqual({
      blocks: expect.arrayContaining([expect.objectContaining({ slug: 'performersList' })]),
    })

    const flattenedFeatures = editorFeatureCalls.flat()
    expect(flattenedFeatures).toContainEqual(PerformersListConversionFeature())
    expect(flattenedFeatures).toContainEqual(ArtistBiographyWarningFeature())
  })

  it('strips media insert features from the biography toolbar', () => {
    const flattenedFeatures = editorFeatureCalls.flat()
    const keys = flattenedFeatures
      .map((feature) => (typeof feature === 'object' && feature !== null && 'key' in feature ? feature.key : undefined))
      .filter((key): key is string => typeof key === 'string')

    expect(keys).not.toContain('upload')
    expect(keys).not.toContain('relationship')
  })

  it('loads blocks before the performers-list converter in actual biography feature output', () => {
    const configured = editorFeatureCalls.at(-1) ?? []
    const keys = configured
      .map((feature) => (typeof feature === 'object' && feature !== null && 'key' in feature ? feature.key : undefined))
      .filter((key): key is string => typeof key === 'string')

    expect(configured).toContainEqual(PerformersListConversionFeature())
    expect(keys.indexOf('blocks')).toBeLessThan(keys.indexOf('performersListConversion'))
  })
})
