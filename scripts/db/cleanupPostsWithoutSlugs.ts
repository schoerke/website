// @ts-nocheck
/**
 * Clean up posts without slugs
 * This removes posts that were created before the slug field was added
 */
import config from '@payload-config'
import 'dotenv/config'
import { getPayload } from 'payload'

const main = async () => {
  const payload = await getPayload({ config })

  console.log('Finding posts without slugs...')

  const postsWithoutSlugs = await payload.find({
    collection: 'posts',
    where: {
      slug: {
        equals: null,
      },
    },
  })

  console.log(`Found ${postsWithoutSlugs.docs.length} posts without slugs`)

  for (const post of postsWithoutSlugs.docs) {
    console.log(`Deleting post ID ${post.id}: ${post.title}`)
    await payload.delete({
      collection: 'posts',
      id: post.id,
    })
  }

  console.log('Done!')
  process.exit(0)
}

main()
