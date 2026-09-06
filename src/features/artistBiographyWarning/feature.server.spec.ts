import { describe, expect, it } from 'vitest'

import { ArtistBiographyWarningFeature } from './feature.server'

describe('ArtistBiographyWarningFeature', () => {
  it('registers its client feature', () => {
    expect(ArtistBiographyWarningFeature()).toMatchObject({
      feature: {
        ClientFeature: '@/features/artistBiographyWarning/feature.client#ArtistBiographyWarningFeatureClient',
      },
      key: 'artistBiographyWarning',
    })
  })
})
