# Plan: Internationalized Instrument Options in Create Artist Form

- **Status**: IMPLEMENTED

## Goal

Enable translated instrument options in the create artist form, so users see instrument names in their selected
language, while the database always stores the English value.

## Approach Summary

- Instrument options are defined as a constant array of `{ value, label: { en, de } }` objects for now, but only the
  `value` is used for translation in the select field.
- Translations are managed in dedicated TypeScript files per language (e.g., `i18n/en.ts`, `i18n/de.ts`) under an
  `instruments` namespace, not JSON files.
- Payload config imports and registers these TypeScript files in the `i18n.translations` setting.
- The select field uses the constant for options, and each option’s label is a function that calls
  `t('instruments:<value>')` for translation, with a type assertion to satisfy Payload’s type system.

## Implementation Steps

1. **Define Instrument Options Constant**
   - File: `src/constants/options.ts`
   - Example:

     ```ts
     export const INSTRUMENTS = [
       { value: 'guitar' },
       { value: 'piano' },
       { value: 'drums' },
       { value: 'violin' },
       // ...
     ]
     ```

2. **Add/Update Translation Files**

- Files: `src/i18n/en.ts`, `src/i18n/de.ts`, etc.
- Example:

      ```ts
      // en.ts
      import { en as defaultEN } from '@payloadcms/translations/languages/en'
      const en = {
        ...defaultEN,
        instruments: {
          piano: 'Piano',
          'piano-forte': 'Piano Forte',
          harpsichord: 'Harpsichord',
          conductor: 'Conductor',
          violin: 'Violin',
          viola: 'Viola',
          cello: 'Violoncello',
          bass: 'Double Bass',
          horn: 'Horn',
          recorder: 'Recorder',
          'chamber-music': 'Chamber Music',
        },
      }
      export default en

      // de.ts
      import { de as defaultDE } from '@payloadcms/translations/languages/de'
      const de = {
        ...defaultDE,
        instruments: {
          piano: 'Klavier',
          'piano-forte': 'Hammerklavier',
          harpsichord: 'Cembalo',
          conductor: 'Dirigent',
          violin: 'Violine',
          viola: 'Bratsche',
          cello: 'Violoncello',
          bass: 'Kontrabass',
          horn: 'Horn',
          recorder: 'Blockflöte',
          'chamber-music': 'Kammermusik',
        },
      }
      export default de
      ```

3. **Register Translations in Payload Config**

- File: `src/payload.config.ts`
- Example:

      ```ts
      import en from './i18n/en'
      import de from './i18n/de'

      export default buildConfig({
        i18n: {
          translations: { en, de },
        },
      })
      ```

4. **Configure Select Field in Collection**
   - File: `src/collections/Artists.ts`
   - Example:

     ```ts
      import { INSTRUMENTS } from '../constants/options'

      {
        name: 'instrument',
        type: 'select',
        options: INSTRUMENTS.map(opt => ({
          value: opt.value,
          label: ({ t }) => (t as any)(`instruments:${opt.value}`),
        })),
        required: true,
        hasMany: true, // if multiple instruments per artist
      }

     ```

## Maintenance & Extension

- To add new instruments, update the constant and all translation files.
- To add a new language, create a new TypeScript translation file and add it to the config.
- This pattern can be reused for other select fields needing i18n.
