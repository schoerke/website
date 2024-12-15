import { NestedKeysStripped } from '@payloadcms/translations'
import type { Config } from 'payload'

export const customTranslations: Config['i18n']['translations'] = {
  de: {
    custom: {},
  },
  en: {
    custom: {},
  },
}

export type CustomTranslationsObject = typeof customTranslations.en
export type CustomTranslationKeys = NestedKeysStripped<CustomTranslationsObject>
