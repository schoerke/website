/**
 * Seed Static Pages into Search Collection
 *
 * This script adds static pages (Contact, Team, Impressum, Datenschutz) to the search
 * collection so they appear in search results alongside content from other collections.
 *
 * Usage:
 *   pnpm tsx scripts/db/seedStaticPages.ts
 *
 * Environment Variables Required:
 *   - DATABASE_URI: Database connection string
 *   - DATABASE_AUTH_TOKEN: Database authentication token
 */

import { getPayload } from 'payload'
import config from '../../src/payload.config'

const STATIC_PAGES = [
  {
    title: 'Kontakt Team Impressum Datenschutz',
    doc: {
      relationTo: 'static-pages',
      value: 'contact-team-legal',
    },
    priority: 10,
    locale: 'de',
  },
  {
    title: 'Contact Team Imprint Privacy Policy',
    doc: {
      relationTo: 'static-pages',
      value: 'contact-team-legal',
    },
    priority: 10,
    locale: 'en',
  },
]

async function seedStaticPages() {
  console.log('🌱 Seeding static pages...')

  try {
    const payload = await getPayload({ config })

    // Clear existing static-pages search records
    const existingRecords = await payload.find({
      collection: 'search' as any,
      where: {
        'doc.relationTo': {
          equals: 'static-pages',
        },
      },
      limit: 100,
    })

    if (existingRecords.docs.length > 0) {
      console.log(`🗑️  Deleting ${existingRecords.docs.length} existing static page records...`)
      for (const doc of existingRecords.docs) {
        await payload.delete({
          collection: 'search' as any,
          id: doc.id,
        })
      }
    }

    // Insert new static page records
    console.log(`✨ Creating ${STATIC_PAGES.length} static page records...`)
    for (const page of STATIC_PAGES) {
      await payload.create({
        collection: 'search' as any,
        data: page,
      })
      console.log(`   ✓ Created: ${page.title} (${page.locale})`)
    }

    console.log('✅ Static pages seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding static pages:', error)
    throw error
  }

  process.exit(0)
}

seedStaticPages()
