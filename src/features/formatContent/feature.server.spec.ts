import { describe, expect, it } from 'vitest'

import { FormatContentFeature } from './feature.server'

describe('FormatContentFeature', () => {
  it('registers its labels under the formatContent namespace', () => {
    const feature = FormatContentFeature() as unknown as {
      feature: { i18n: { de: { format: string }; en: { format: string } } }
      key: string
    }

    expect(feature).toMatchObject({
      feature: {
        i18n: {
          de: { format: 'Formatieren' },
          en: { format: 'Format' },
        },
      },
      key: 'formatContent',
    })
  })
})
