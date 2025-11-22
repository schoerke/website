/**
 * English (en) Translations
 *
 * This file contains all English translations for the application, organized
 * by namespace. It extends Payload CMS's default English translations and adds
 * custom translations for the frontend.
 *
 * Structure:
 * - custom.instruments: Musical instrument names
 * - custom.pages: Page titles and page-specific text
 * - custom.footer: Footer text (copyright, etc.)
 *
 * Usage in server components:
 *   const t = await getTranslations({ locale, namespace: 'custom.pages.home' })
 *
 * Usage in client components:
 *   const t = useTranslations('custom.instruments')
 *
 * @see https://next-intl.dev/docs/usage/messages
 */
import { en as defaultEN } from '@payloadcms/translations/languages/en'

const en = {
  ...defaultEN,
  custom: {
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
    pages: {
      home: {
        title: 'Home',
      },
      artists: {
        title: 'Artists',
      },
      artist: {
        backButton: 'Back to Artists',
        contactPersons: 'Contact Persons',
        tabs: {
          biography: 'Biography',
          repertoire: 'Repertoire',
          discography: 'Discography',
          video: 'Video',
          news: 'News',
          projects: 'Projects',
          concertDates: 'Concert Dates',
        },
        empty: {
          biography: 'No biography available.',
          repertoire: 'No repertoire information available.',
          discography: 'No discography entries available.',
          video: 'No videos available.',
          news: 'No news articles available.',
          projects: 'No projects available.',
          concertDates: 'No upcoming concert dates.',
        },
        loading: 'Loading...',
        video: {
          accordionTrigger: 'Show video',
        },
        concertDates: {
          button: 'View Concert Dates',
        },
      },
      contact: {
        title: 'Contact',
      },
      news: {
        title: 'News',
      },
      projects: {
        title: 'Projects',
      },
      team: {
        title: 'Team',
      },
      impressum: {
        title: 'Legal Notice',
      },
      datenschutz: {
        title: 'Privacy Policy',
      },
      brand: {
        title: 'Branding',
      },
    },
    footer: {
      copyright: 'All rights reserved.',
    },
  },
}

export default en
