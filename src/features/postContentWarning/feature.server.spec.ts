import { describe, expect, it } from 'vitest'

import { PostContentWarningFeature } from './feature.server'

describe('PostContentWarningFeature', () => {
  it('registers its client feature', () => {
    expect(PostContentWarningFeature()).toMatchObject({
      feature: {
        ClientFeature: '@/features/postContentWarning/feature.client#PostContentWarningFeatureClient',
      },
      key: 'postContentWarning',
    })
  })
})
