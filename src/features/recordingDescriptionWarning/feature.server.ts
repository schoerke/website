import { createServerFeature } from '@payloadcms/richtext-lexical'

export const RecordingDescriptionWarningFeature = createServerFeature({
  key: 'recordingDescriptionWarning',
  feature: {
    ClientFeature:
      '@/features/recordingDescriptionWarning/feature.client#RecordingDescriptionWarningFeatureClient',
  },
})