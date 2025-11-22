// @ts-nocheck
import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

const main = async () => {
  const payload = await getPayload({ config })

  // Check all recordings
  const recordings = await payload.find({
    collection: 'recordings',
    limit: 100,
  })

  console.log('Total recordings:', recordings.totalDocs)

  // Group by artist
  const byArtist = {}
  for (const rec of recordings.docs) {
    if (rec.artistRoles?.[0]?.artist) {
      const artist = rec.artistRoles[0].artist
      const artistName = typeof artist === 'string' ? artist : artist?.name
      if (!byArtist[artistName]) byArtist[artistName] = []
      byArtist[artistName].push(rec)
    }
  }

  console.log('\nRecordings by artist:')
  for (const [artist, recs] of Object.entries(byArtist)) {
    console.log(`\n${artist}: ${recs.length} recordings`)
    // Show first 2
    recs.slice(0, 2).forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec.title}`)
      console.log(`     Year: ${rec.recordingYear || 'N/A'}  Label: ${rec.recordingLabel || 'N/A'}`)
    })
  }

  process.exit(0)
}

main()
