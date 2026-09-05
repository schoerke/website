import { describe, expect, it } from 'vitest'

import { RecordingDescriptionWarningFeature } from './feature.server'

describe('RecordingDescriptionWarningFeature', () => {
  it('registers its client feature', () => {
    expect(RecordingDescriptionWarningFeature()).toMatchObject({
      feature: {
        ClientFeature:
          '@/features/recordingDescriptionWarning/feature.client#RecordingDescriptionWarningFeatureClient',
      },
      key: 'recordingDescriptionWarning',
    })
  })
})