import { BlocksFeature, sortFeaturesForOptimalLoading } from '@payloadcms/richtext-lexical'
import { describe, expect, it } from 'vitest'

import { EventDatesConversionFeature } from '@/features/eventDatesConverter/feature.server'

import { PerformersListConversionFeature } from './feature.server'

describe('PerformersListConversionFeature ordering', () => {
  it('registers its toolbar labels under a separate feature key', () => {
    const feature = PerformersListConversionFeature() as unknown as {
      feature: { i18n: { de: { convert: string }; en: { convert: string } } }
      key: string
    }

    expect(feature).toMatchObject({
      feature: {
        i18n: {
          de: { convert: 'Convert to PerformersList' },
          en: { convert: 'Convert to PerformersList' },
        },
      },
      key: 'performersListConversion',
    })
  })

  it('loads blocks before both converter clients regardless of config order', () => {
    const features = sortFeaturesForOptimalLoading([
      EventDatesConversionFeature(),
      PerformersListConversionFeature(),
      BlocksFeature({ blocks: [] }),
    ] as unknown as Parameters<typeof sortFeaturesForOptimalLoading>[0])

    const keys = features.map((feature) => feature.key)
    expect(keys).toContain('eventDatesConversion')
    expect(keys).toContain('performersListConversion')
    expect(keys.indexOf('blocks')).toBeLessThan(keys.indexOf('eventDatesConversion'))
    expect(keys.indexOf('blocks')).toBeLessThan(keys.indexOf('performersListConversion'))
  })
})
