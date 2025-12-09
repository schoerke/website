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
  common: {
    all: 'All',
  },
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
    recordingRoles: {
      soloist: 'Soloist',
      conductor: 'Conductor',
      ensemble_member: 'Ensemble Member',
      chamber_musician: 'Chamber Musician',
      accompanist: 'Accompanist',
    },
    pages: {
      home: {
        title: 'Home',
      },
      artists: {
        title: 'Artists',
        discoverMore: 'Discover More Artists',
      },
      artist: {
        backButton: 'Back to Artists',
        contactPersons: 'Contact Persons',
        tabs: {
          biography: 'Biography',
          repertoire: 'Repertoire',
          discography: 'Recordings',
          video: 'Video',
          news: 'News',
          projects: 'Projects',
          concertDates: 'Calendar',
        },
        empty: {
          biography: 'No biography available.',
          repertoire: 'No repertoire information available.',
          discography: 'No recordings available.',
          video: 'No videos available.',
          news: 'No news articles available.',
          projects: 'No projects available.',
          concertDates: 'No upcoming dates.',
        },
        loading: 'Loading...',
        video: {
          accordionTrigger: 'Show video',
        },
        concertDates: {
          button: 'View Calendar',
        },
      },
      contact: {
        title: 'Contact',
      },
      news: {
        learnMore: 'Learn more',
        title: 'News',
        goBack: 'Go back',
        allNews: 'All News',
        loading: 'Loading news posts',
        loadingPosts: 'Loading news posts, please wait...',
      },
      projects: {
        learnMore: 'Learn more',
        title: 'Projects',
        goBack: 'Go back',
        allProjects: 'All Projects',
        loading: 'Loading project posts',
        loadingPosts: 'Loading project posts, please wait...',
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
      navigationLabel: 'Footer navigation',
      legalNavigationLabel: 'Legal navigation',
      socialMedia: {
        visitFacebook: 'Visit us on Facebook',
        visitInstagram: 'Visit us on Instagram',
        visitTwitter: 'Visit us on Twitter',
        visitYouTube: 'Visit us on YouTube',
      },
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      goPrevious: 'Go to previous page',
      goNext: 'Go to next page',
      goToPage: 'Go to page {page}',
      currentPage: 'Current page, page {page}',
      morePages: 'More pages',
      postsPerPage: 'Posts per page',
      search: 'Search',
      searchNews: 'Search news',
      searchProjects: 'Search projects',
      searchMinChars: 'Enter at least {minChars} characters to search',
    },
  },
}

export default en
