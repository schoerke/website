/**
 * Master Seed Script
 *
 * Re-seeds the entire database with all seed data:
 * - Employees
 * - Artists (with sample discography)
 * - Posts (news, projects, home, and artist-specific)
 *
 * Usage:
 *   pnpm seed:all
 *   PAYLOAD_DROP_DATABASE=true pnpm seed:all  # Start fresh
 */

import config from '@payload-config'
import { exec } from 'child_process'
import 'dotenv/config'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const execPromise = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runScript(scriptPath: string, description: string, useTsx = false) {
  console.log(`\n🔄 ${description}...`)
  try {
    // Remove PAYLOAD_DROP_DATABASE from child processes
    const env = { ...process.env }
    delete env.PAYLOAD_DROP_DATABASE

    const command = useTsx ? `pnpx tsx ${scriptPath}` : `pnpm payload run ${scriptPath}`

    const { stdout, stderr } = await execPromise(command, {
      cwd: path.resolve(__dirname, '../..'),
      env,
    })

    if (stdout) console.log(stdout)
    if (stderr && !stderr.includes('WARN')) console.error(stderr)

    console.log(`✅ ${description} completed`)
    return true
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('🌱 Master Seed Script - Re-seeding Database')
  console.log('='.repeat(60))

  // Initialize Payload to check/clear existing data
  const payload = await getPayload({ config })

  // Check if data already exists
  console.log('\n🔍 Checking existing data...')

  const employeesCount = (await payload.count({ collection: 'employees' as any })).totalDocs
  const artistsCount = (await payload.count({ collection: 'artists' as any })).totalDocs
  const recordingsCount = (await payload.count({ collection: 'recordings' as any })).totalDocs
  const postsCount = (await payload.count({ collection: 'posts' as any })).totalDocs

  console.log(`   Employees: ${employeesCount}`)
  console.log(`   Artists: ${artistsCount}`)
  console.log(`   Recordings: ${recordingsCount}`)
  console.log(`   Posts: ${postsCount}`)

  if (employeesCount > 0 || artistsCount > 0 || recordingsCount > 0 || postsCount > 0) {
    console.log('\n⚠️  Warning: Database contains existing data!')
    console.log('   This script will skip seeding if data conflicts occur.')
    console.log('   To start fresh, use: PAYLOAD_DROP_DATABASE=true pnpm seed:all')
  }

  const scripts = [
    { path: './scripts/db/seedEmployees.ts', description: 'Seeding Employees', useTsx: false },
    { path: './scripts/db/seedArtists.ts', description: 'Seeding Artists', useTsx: false },
    { path: './scripts/db/restoreDiscography.ts', description: 'Restoring Sample Discography', useTsx: true },
    { path: './scripts/db/seedPosts.ts', description: 'Seeding Posts', useTsx: false },
  ]

  let successCount = 0
  let failCount = 0

  for (const script of scripts) {
    const success = await runScript(script.path, script.description, script.useTsx)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Seed Summary')
  console.log('='.repeat(60))
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log('='.repeat(60))

  if (failCount > 0) {
    console.log('\n⚠️  Some seed scripts failed. Check the errors above.')
    console.log('   Tip: Use PAYLOAD_DROP_DATABASE=true pnpm seed:all to start fresh.')
    process.exit(1)
  } else {
    console.log('\n🎉 All seed data loaded successfully!')
    console.log('\nNext steps:')
    console.log('  1. Run migration: pnpm migrate:discography')
    console.log('  2. Start dev server: pnpm dev')
  }

  process.exit(0)
}

main()
