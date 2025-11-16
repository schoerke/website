/**
 * German (de) Translations
 *
 * This file contains all German translations for the application, organized
 * by namespace. It extends Payload CMS's default German translations and adds
 * custom translations for the frontend.
 *
 * Structure:
 * - custom.instruments: Musical instrument names
 * - custom.pages: Page titles and page-specific text
 * - custom.footer: Footer text (copyright, etc.)
 *
 * Note: This file should mirror the structure of en.ts to ensure all
 * translation keys are available in both languages.
 *
 * Usage in server components:
 *   const t = await getTranslations({ locale, namespace: 'custom.pages.home' })
 *
 * Usage in client components:
 *   const t = useTranslations('custom.instruments')
 *
 * @see https://next-intl.dev/docs/usage/messages
 */
import { de as defaultDE } from '@payloadcms/translations/languages/de'

const de = {
  ...defaultDE,
  custom: {
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
    pages: {
      home: {
        title: 'Start',
      },
      artists: {
        title: 'Künstler:innen',
      },
      artist: {
        backButton: 'Zurück',
        contactPersons: 'Ansprechpartner',
      },
      contact: {
        title: 'Kontakt',
      },
      news: {
        title: 'News',
      },
      projects: {
        title: 'Projekte',
      },
      team: {
        title: 'Team',
      },
      impressum: {
        title: 'Impressum',
      },
      datenschutz: {
        title: 'Datenschutz',
      },
      brand: {
        title: 'Branding',
      },
    },
    footer: {
      copyright: 'Alle Rechte vorbehalten.',
    },
  },
}

export default de
