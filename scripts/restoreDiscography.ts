// @ts-nocheck
/**
 * Restore Sample Discography Data
 *
 * This script adds sample discography data back to artists for testing the migration.
 * In production, you would restore from a backup or re-enter the actual data.
 */
import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

const christianZachariasDiscography = {
  de: {
    root: {
      children: [
        {
          type: 'heading',
          tag: 'h1',
          children: [{ type: 'text', text: 'Solist', format: 0 }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Bach', format: 1 },
            { type: 'text', text: ' - Partita in a-moll, Französische Suiten BWV 813, 814 & 816 •  ', format: 0 },
            { type: 'text', text: 'MDG 903 2280-6 SACD (2023)', format: 2 },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Mozart', format: 1 },
            { type: 'text', text: ' - Klavierkonzerte A-Dur KV 414 und D-Dur KV 537 • ', format: 0 },
            { type: 'text', text: 'MDG 940 1759-6 (2012)', format: 2 },
          ],
        },
        {
          type: 'heading',
          tag: 'h1',
          children: [{ type: 'text', text: 'Dirigent', format: 0 }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Mozart', format: 1 },
            {
              type: 'text',
              text: ' - Konzert für drei Klaviere F-Dur KV 242 • Konzert für zwei Klaviere Es-Dur KV 365 • ',
              format: 0,
            },
            { type: 'text', text: 'EMI 7 41112 7 (1996)', format: 2 },
          ],
        },
      ],
    },
  },
  en: {
    root: {
      children: [
        {
          type: 'heading',
          tag: 'h1',
          children: [{ type: 'text', text: 'Soloist', format: 0 }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Bach', format: 1 },
            { type: 'text', text: ' - Partita in A minor, French Suites BWV 813, 814 & 816 •  ', format: 0 },
            { type: 'text', text: 'MDG 903 2280-6 SACD (2023)', format: 2 },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Mozart', format: 1 },
            { type: 'text', text: ' - Piano Concertos in A major KV 414 and D major KV 537 • ', format: 0 },
            { type: 'text', text: 'MDG 940 1759-6 (2012)', format: 2 },
          ],
        },
        {
          type: 'heading',
          tag: 'h1',
          children: [{ type: 'text', text: 'Conductor', format: 0 }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Mozart', format: 1 },
            {
              type: 'text',
              text: ' - Concerto for three pianos in F major KV 242 • Concerto for two pianos in E-flat major KV 365 • ',
              format: 0,
            },
            { type: 'text', text: 'EMI 7 41112 7 (1996)', format: 2 },
          ],
        },
      ],
    },
  },
}

const tianwaYangDiscography = {
  de: {
    root: {
      children: [
        {
          type: 'heading',
          tag: 'h1',
          children: [{ type: 'text', text: 'Solistin', format: 0 }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Prokofiev', format: 1 },
            { type: 'text', text: ' - Violinkonzerte Nr. 1 und 2 • Solosonaten • ', format: 0 },
            { type: 'text', text: 'Naxos 8.574107', format: 2 },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Brahms', format: 1 },
            { type: 'text', text: ' - Violinkonzert • Doppelkonzert • ', format: 0 },
            { type: 'text', text: 'Naxos 8.551421', format: 2 },
          ],
        },
      ],
    },
  },
  en: {
    root: {
      children: [
        {
          type: 'heading',
          tag: 'h1',
          children: [{ type: 'text', text: 'Soloist', format: 0 }],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Prokofiev', format: 1 },
            { type: 'text', text: ' - Violin Concertos No. 1 and 2 • Solo Sonatas • ', format: 0 },
            { type: 'text', text: 'Naxos 8.574107', format: 2 },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Brahms', format: 1 },
            { type: 'text', text: ' - Violin Concerto • Double Concerto • ', format: 0 },
            { type: 'text', text: 'Naxos 8.551421', format: 2 },
          ],
        },
      ],
    },
  },
}

const main = async () => {
  const payload = await getPayload({ config })

  console.log('Restoring sample discography data...\n')

  // Find artists
  const artists = await payload.find({
    collection: 'artists',
    limit: 10,
  })

  for (const artist of artists.docs) {
    let discography = null

    if (artist.name === 'Christian Zacharias') {
      discography = christianZachariasDiscography
    } else if (artist.name === 'Tianwa Yang') {
      discography = tianwaYangDiscography
    }

    if (discography) {
      // Fetch current artist data to preserve required fields
      const artistDE = await payload.findByID({
        collection: 'artists',
        id: artist.id,
        locale: 'de',
      })

      const artistEN = await payload.findByID({
        collection: 'artists',
        id: artist.id,
        locale: 'en',
      })

      // Update DE
      await payload.update({
        collection: 'artists',
        id: artist.id,
        data: {
          ...artistDE,
          discography: discography.de,
        },
        locale: 'de',
      })

      // Update EN
      await payload.update({
        collection: 'artists',
        id: artist.id,
        data: {
          ...artistEN,
          discography: discography.en,
        },
        locale: 'en',
      })

      console.log(`✅ Restored discography for: ${artist.name}`)
    }
  }

  console.log('\n✅ Sample discography data restored!')
  console.log('   You can now run the migration script.')

  process.exit(0)
}

main()
