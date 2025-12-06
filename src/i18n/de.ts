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
  common: {
    all: 'Alle',
  },
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
    recordingRoles: {
      soloist: 'Solist',
      conductor: 'Dirigent',
      ensemble_member: 'Ensemblemitglied',
      chamber_musician: 'Kammermusiker',
      accompanist: 'Begleiter',
    },
    pages: {
      home: {
        title: 'Start',
      },
      artists: {
        title: 'Künstler:innen',
        discoverMore: 'Weitere Künstler:innen entdecken',
      },
      artist: {
        backButton: 'Zurück',
        contactPersons: 'Ansprechpartner',
        tabs: {
          biography: 'Biographie',
          repertoire: 'Repertoire',
          discography: 'Recordings',
          video: 'Video',
          news: 'News',
          projects: 'Projekte',
          concertDates: 'Kalender',
        },
        empty: {
          biography: 'Keine Biographie verfügbar.',
          repertoire: 'Keine Repertoire-Informationen verfügbar.',
          discography: 'Keine Recordings verfügbar.',
          video: 'Keine Videos verfügbar.',
          news: 'Keine News-Artikel verfügbar.',
          projects: 'Keine Projekte verfügbar.',
          concertDates: 'Keine anstehenden Termine.',
        },
        loading: 'Laden...',
        video: {
          accordionTrigger: 'Video anzeigen',
        },
        concertDates: {
          button: 'Kalender ansehen',
        },
      },
      contact: {
        title: 'Kontakt',
      },
      news: {
        learnMore: 'Mehr erfahren',
        title: 'News',
        goBack: 'Zurück',
        allNews: 'Alle News',
      },
      projects: {
        learnMore: 'Mehr erfahren',
        title: 'Projekte',
        goBack: 'Zurück',
        allProjects: 'Alle Projekte',
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
      navigationLabel: 'Footer-Navigation',
      legalNavigationLabel: 'Rechtliche Navigation',
      socialMedia: {
        visitFacebook: 'Besuchen Sie uns auf Facebook',
        visitInstagram: 'Besuchen Sie uns auf Instagram',
        visitTwitter: 'Besuchen Sie uns auf Twitter',
        visitYouTube: 'Besuchen Sie uns auf YouTube',
      },
    },
  },
}

export default de
