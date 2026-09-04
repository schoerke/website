import { BlocksFeature, createServerFeature, sortFeaturesForOptimalLoading } from '@payloadcms/richtext-lexical'
import { describe, expect, it } from 'vitest'

import { EventDatesConversionFeature } from './feature.server'

describe('EventDatesConversionFeature ordering', () => {
  it('registers English and German toolbar labels under its feature namespace', () => {
    const feature = EventDatesConversionFeature() as unknown as {
      feature: { i18n: { de: { convert: string }; en: { convert: string } } }
      key: string
    }

    expect(feature).toMatchObject({
      feature: {
        i18n: {
          de: { convert: 'Convert to EventDates' },
          en: { convert: 'Convert to EventDates' },
        },
      },
      key: 'eventDatesConversion',
    })
  })

  it('resolves BlocksFeature before the converter when config order is intentionally inverse', () => {
    const features = sortFeaturesForOptimalLoading([
      EventDatesConversionFeature(),
      BlocksFeature({ blocks: [] }),
    ] as unknown as Parameters<typeof sortFeaturesForOptimalLoading>[0])

    expect(features.map((feature) => feature.key)).toEqual(['blocks', 'eventDatesConversion'])
  })

  it('cannot use Payload 3.88 priority dependency ordering', () => {
    const priorityFeature = createServerFeature({
      key: 'priorityFeature',
      dependenciesPriority: ['blocks'],
      feature: {},
    })

    const features = sortFeaturesForOptimalLoading([
      BlocksFeature({ blocks: [] }),
      priorityFeature(),
    ] as unknown as Parameters<typeof sortFeaturesForOptimalLoading>[0])

    expect(features.map((feature) => feature.key)).toEqual(['priorityFeature', 'blocks'])
  })
})
