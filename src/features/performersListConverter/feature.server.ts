import { createServerFeature } from '@payloadcms/richtext-lexical'

export const PerformersListConversionFeature = createServerFeature({
  key: 'performersListConversion',
  feature: {
    ClientFeature: '@/features/performersListConverter/feature.client#PerformersListConversionFeatureClient',
    i18n: {
      de: {
        convert: 'Convert to PerformersList',
      },
      en: {
        convert: 'Convert to PerformersList',
      },
    },
  },
})
