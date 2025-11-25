/**
 * WordPress to Payload CMS Repertoire Migration Script
 */

import config from '@payload-config'
import 'dotenv/config'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import { htmlToLexical } from './utils/lexicalConverter'
import { parseWordPressXML } from './utils/xmlParser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface RepertoireData {
  slug: string
  title: string
  content: string
  categories: string[]
}

/**
 * Translate DE title to EN
 */
function translateTitle(deTitle: string): string {
  return deTitle
    .replace(/Dirigent/g, 'Conductor')
    .replace(/Klavier/g, 'Piano')
    .replace(/Violine/g, 'Violin')
    .replace(/Violoncello/g, 'Cello')
    .replace(/Blockflöte/g, 'Recorder')
    .replace(/Horn/g, 'Horn')
    .replace(/Duo/g, 'Duo')
}

interface RepertoireData {
  slug: string
  title: string
  content: string
  categories: string[]
}

/**
 * Extract categories from WordPress item
 */
function extractCategories(item: any): string[] {
  const cats = item.category
  if (!cats) return []
  if (Array.isArray(cats)) {
    return cats.map((c: any) => (typeof c === 'string' ? c : c['#text'] || '')).filter(Boolean)
  }
  return [typeof cats === 'string' ? cats : cats['#text'] || ''].filter(Boolean)
}

/**
 * Extract artist names (returns array to handle duos/ensembles)
 * Duos: "Duo Thomas Zehetmair & Ruth Killius" → ["Thomas Zehetmair", "Ruth Killius"]
 * Solo: "Christian Zacharias" → ["Christian Zacharias"]
 */
function extractArtistNames(categories: string[], slug: string): string[] {
  const generic = ['Repertoire', 'Projekte', 'Projects']

  // Try categories first
  for (const cat of categories) {
    if (!generic.includes(cat)) {
      // Decode HTML entities
      const decoded = cat.replace(/&amp;/g, '&')

      // Check if it's a duo/ensemble
      const duoMatch = decoded.match(/^Duo\s+(.+?)\s+(?:&|and|und)\s+(.+)$/i)
      if (duoMatch) {
        return [duoMatch[1].trim(), duoMatch[2].trim()]
      }

      const trioMatch = decoded.match(/^Trio\s+(.+)$/i)
      if (trioMatch) {
        return [trioMatch[1].trim()]
      }

      return [decoded]
    }
  }

  // Fallback: parse slug
  const patterns = [/^repertoire-(.+)$/, /^(.+?)-repertoire/]

  for (const p of patterns) {
    const m = slug.match(p)
    if (m) {
      const name = m[1].replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      return [name]
    }
  }

  return []
}

/**
 * Extract roles
 */
function extractRoles(slug: string, title: string): Array<'solo' | 'chamber' | 'conductor'> {
  const roles: Array<'solo' | 'chamber' | 'conductor'> = []
  const s = slug.toLowerCase()
  const t = title.toLowerCase()

  if (s.includes('playconduct') || s.includes('play-conduct') || t.includes('play/conduct')) {
    return ['solo', 'conductor']
  }

  if (s.includes('dirigent') || s.includes('conductor') || t.includes('dirigent') || t.includes('conductor')) {
    roles.push('conductor')
  }

  const instruments = [
    'klavier',
    'piano',
    'violine',
    'violin',
    'viola',
    'violoncello',
    'cello',
    'horn',
    'blockfloete',
    'recorder',
  ]
  if (instruments.some((i) => s.includes(i)) && !roles.includes('conductor')) {
    roles.push('solo')
  }

  const ensembles = ['duo', 'trio', 'quartett', 'quintett']
  if (ensembles.some((e) => s.includes(e))) {
    roles.push('chamber')
  }

  return roles
}

/**
 * Generate title from artist names
 */
function generateTitle(artistNames: string[], slug: string, wpTitle: string): string {
  const s = slug.toLowerCase()
  const t = wpTitle.toLowerCase()

  // For duos, create "Duo Name1 & Name2" format
  if (artistNames.length === 2) {
    return `Duo ${artistNames[0]} & ${artistNames[1]}`
  }

  const artist = artistNames[0]

  if (s.includes('playconduct') || s.includes('play-conduct') || t.includes('play/conduct')) {
    return `${artist} Play/Conduct`
  }

  if (s.includes('dirigent') || s.includes('-conductor')) return `${artist} Conductor`
  if (s.includes('klavier') || s.includes('-piano')) return `${artist} Piano`
  if (s.includes('violine') || s.includes('-violin')) return `${artist} Violin`
  if (s.includes('-viola')) return `${artist} Viola`
  if (s.includes('violoncello') || s.includes('-cello')) return `${artist} Cello`
  if (s.includes('-horn')) return `${artist} Horn`
  if (s.includes('blockfloete') || s.includes('recorder')) return `${artist} Recorder`

  return artist
}

/**
 * Find artist by name
 */
async function findArtist(payload: any, name: string): Promise<string | null> {
  const result = await payload.find({
    collection: 'artists',
    where: { name: { equals: name } },
    limit: 1,
  })

  if (result.docs.length > 0) return result.docs[0].id

  const fuzzy = await payload.find({
    collection: 'artists',
    where: { name: { contains: name.split(' ')[0] } },
    limit: 5,
  })

  for (const artist of fuzzy.docs) {
    if (artist.name.toLowerCase().includes(name.toLowerCase())) {
      console.log(`  Fuzzy: "${name}" → "${artist.name}"`)
      return artist.id
    }
  }

  return null
}

async function migrateRepertoire() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('🎼 WordPress Repertoire Migration')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('')

  const payload = await getPayload({ config })

  const dePath = path.join(__dirname, 'data', 'all-de.xml')
  const enPath = path.join(__dirname, 'data', 'all-en.xml')

  const deItems = await parseWordPressXML(dePath)
  const enItems = await parseWordPressXML(enPath)

  // Filter and parse repertoire posts
  const deRep: RepertoireData[] = []
  const enRep: RepertoireData[] = []

  for (const item of deItems) {
    if (item['wp:post_type'] === 'post') {
      const cats = extractCategories(item)
      if (cats.includes('Repertoire')) {
        deRep.push({
          slug: item['wp:post_name'],
          title: item.title || '',
          content: item['content:encoded'] || '',
          categories: cats,
        })
      }
    }
  }

  for (const item of enItems) {
    if (item['wp:post_type'] === 'post') {
      const cats = extractCategories(item)
      if (cats.includes('Repertoire')) {
        enRep.push({
          slug: item['wp:post_name'],
          title: item.title || '',
          content: item['content:encoded'] || '',
          categories: cats,
        })
      }
    }
  }

  console.log(`Found ${deRep.length} DE, ${enRep.length} EN posts\n`)

  // Delete all existing repertoire entries before migration
  if (!dryRun) {
    console.log('Deleting existing repertoire entries...')
    const existing = await payload.find({
      collection: 'repertoire',
      limit: 1000,
      locale: 'all',
    })

    for (const doc of existing.docs) {
      await payload.delete({
        collection: 'repertoire',
        id: doc.id,
      })
    }
    console.log(`✅ Deleted ${existing.docs.length} existing entries\n`)
  }

  // Group by slug
  const map = new Map<string, { de?: RepertoireData; en?: RepertoireData }>()

  for (const post of deRep) {
    map.set(post.slug, { de: post })
  }

  for (const post of enRep) {
    const ex = map.get(post.slug) || {}
    map.set(post.slug, { ...ex, en: post })
  }

  let created = 0,
    skipped = 0,
    errors = 0

  for (const [slug, { de, en }] of map) {
    const src = de || en
    if (!src) continue

    try {
      const artistNames = extractArtistNames(src.categories, slug)
      if (artistNames.length === 0) {
        console.log(`⚠️  Skip ${slug}: no artist`)
        skipped++
        continue
      }

      // Look up all artists (supports duos/ensembles)
      const artistIds: number[] = []
      for (const name of artistNames) {
        const id = await findArtist(payload, name)
        if (id) {
          artistIds.push(Number(id))
        } else {
          console.log(`⚠️  Artist not found: "${name}"`)
        }
      }

      if (artistIds.length === 0) {
        console.log(`⚠️  Skip ${slug}: no artists found in database`)
        skipped++
        continue
      }

      const roles = extractRoles(slug, src.title)
      const title = generateTitle(artistNames, slug, src.title)

      console.log(`📝 ${title}`)
      if (verbose) {
        console.log(`   Slug: ${slug}`)
        console.log(`   Artists: ${artistNames.join(', ')}`)
        console.log(`   Roles: ${roles.join(', ') || 'none'}`)
      }

      if (!dryRun) {
        if (de) {
          const lexContent = htmlToLexical(de.content)
          const doc = await payload.create({
            collection: 'repertoire',
            data: {
              title,
              content: lexContent as any,
              artists: artistIds,
              roles: roles.length > 0 ? roles : undefined,
            },
            locale: 'de',
          })

          if (en) {
            // EN post exists - use its content
            const lexContentEn = htmlToLexical(en.content)
            const enTitle = translateTitle(title) // Translate DE title to EN
            await payload.update({
              collection: 'repertoire',
              id: doc.id,
              data: {
                title: enTitle,
                content: lexContentEn as any,
                artists: artistIds,
                roles: roles.length > 0 ? roles : undefined,
              },
              locale: 'en',
            })
          } else {
            // No EN post - copy DE content and translate title
            const enTitle = translateTitle(title)
            await payload.update({
              collection: 'repertoire',
              id: doc.id,
              data: {
                title: enTitle,
                content: lexContent as any, // Copy DE content
                artists: artistIds,
                roles: roles.length > 0 ? roles : undefined,
              },
              locale: 'en',
            })
          }

          console.log(`   ✅ Created (${doc.id})`)
          created++
        }
      } else {
        console.log(`   🔍 Would create`)
        created++
      }

      console.log('')
    } catch (error) {
      console.error(`❌ Error: ${slug}`, error)
      errors++
    }
  }

  console.log('='.repeat(60))
  console.log(`Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`)
  if (dryRun) console.log('\n⚠️  DRY RUN - no changes made')

  process.exit(0)
}

migrateRepertoire().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
