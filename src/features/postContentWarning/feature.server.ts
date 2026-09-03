import { createServerFeature } from '@payloadcms/richtext-lexical'

export const PostContentWarningFeature = createServerFeature({
  key: 'postContentWarning',
  feature: {
    ClientFeature: '@/features/postContentWarning/feature.client#PostContentWarningFeatureClient',
  },
})
