import { createServerFeature } from '@payloadcms/richtext-lexical'

export const AlignmentFeature = createServerFeature({
  key: 'alignment',
  feature: {
    ClientFeature: '@/features/alignment/feature.client#AlignmentFeatureClient',
    i18n: {
      de: {
        alignLeftLabel: 'Links ausrichten',
        alignCenterLabel: 'Zentrieren',
        alignRightLabel: 'Rechts ausrichten',
      },
      en: {
        alignLeftLabel: 'Align left',
        alignCenterLabel: 'Align center',
        alignRightLabel: 'Align right',
      },
    },
  },
})
