import { createServerFeature } from '@payloadcms/richtext-lexical'

export const EventDatesConversionFeature = createServerFeature({
  key: 'eventDatesConversion',
  feature: {
    ClientFeature: '@/features/eventDatesConverter/feature.client#EventDatesConversionFeatureClient',
    i18n: {
      de: {
        convert: 'Convert to EventDates',
      },
      en: {
        convert: 'Convert to EventDates',
      },
    },
  },
})
