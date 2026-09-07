import { createServerFeature } from '@payloadcms/richtext-lexical'

export const FormatContentFeature = createServerFeature({
  key: 'formatContent',
  feature: {
    ClientFeature: '@/features/formatContent/feature.client#FormatContentFeatureClient',
    i18n: {
      de: {
        format: 'Formatieren',
      },
      en: {
        format: 'Format',
      },
    },
  },
})
