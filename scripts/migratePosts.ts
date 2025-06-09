// https://payloadcms.com/posts/blog/how-to-migrate-from-wordpress-to-payload
// Download wp-data.xml from WordPress: Tools > Export > Posts > Download Export File

import { XMLParser } from 'fast-xml-parser'
import * as fs from 'fs/promises'
import { getPayload } from 'payload'

export const migratePosts = async () => {
  console.log('Starting migration:')

  const awaitConfig = await import('../src/payload.config')
  const config = awaitConfig.default
  const payload = await getPayload({ config })

  // Assemble the posts data
  const xmlData = await fs.readFile('./data/posts.xml', 'utf8')

  const parser = new XMLParser()
  const wpData = parser.parse(xmlData)

  for (const blogPost of wpData.rss.channel.item) {
    console.log({ blogPost })
  }
}

migratePosts()
