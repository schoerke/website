import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access/authenticated'
import { authenticatedOrPublished } from '@/access/authenticatedOrPublished'

export const HomePageGlobal: GlobalConfig = {
  slug: 'home-page',
  label: {
    de: 'Startseite',
    en: 'Home Page',
  },
  access: {
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    group: 'Content Management',
  },
  fields: [
    {
      name: 'artistsIntro',
      type: 'textarea',
      localized: true,
      label: {
        de: 'Künstler:innen — Einleitungstext',
        en: 'Artists — Intro Text',
      },
      admin: {
        description: {
          de: 'Kurzer Einleitungstext für den Künstler:innen-Bereich auf der Startseite.',
          en: 'Short intro text for the artists section on the homepage.',
        },
      },
    },
    {
      name: 'teamIntro',
      type: 'textarea',
      localized: true,
      label: {
        de: 'Team — Einleitungstext',
        en: 'Team — Intro Text',
      },
      admin: {
        description: {
          de: 'Kurzer Einleitungstext für den Team-Bereich auf der Startseite.',
          en: 'Short intro text for the team section on the homepage.',
        },
      },
    },
    {
      name: 'contactIntro',
      type: 'textarea',
      localized: true,
      label: {
        de: 'Kontakt — Einleitungstext',
        en: 'Contact — Intro Text',
      },
      admin: {
        description: {
          de: 'Kurzer Einleitungstext für den Kontakt-Bereich auf der Startseite.',
          en: 'Short intro text for the contact section on the homepage.',
        },
      },
    },
  ],
}
