import { createServerFeature } from '@payloadcms/richtext-lexical'

export const ArtistBiographyWarningFeature = createServerFeature({
  key: 'artistBiographyWarning',
  feature: {
    ClientFeature: '@/features/artistBiographyWarning/feature.client#ArtistBiographyWarningFeatureClient',
  },
})
