// @ts-nocheck
import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

const main = async () => {
  const payload = await getPayload({ config })

  console.log('Fetching all recordings...')
  const recordings = await payload.find({
    collection: 'recordings',
    limit: 1000,
  })

  console.log(`Found ${recordings.totalDocs} recordings to delete`)

  if (recordings.totalDocs === 0) {
    console.log('No recordings to delete')
    process.exit(0)
  }

  console.log('Deleting recordings...')
  for (const recording of recordings.docs) {
    await payload.delete({
      collection: 'recordings',
      id: recording.id,
    })
    console.log(`  ✓ Deleted: ${recording.title}`)
  }

  console.log(`\n✅ Deleted ${recordings.totalDocs} recordings`)
  process.exit(0)
}

main()
