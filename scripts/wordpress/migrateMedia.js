// https://payloadcms.com/posts/blog/how-to-migrate-from-wordpress-to-payload
// 1. Export media.xml from WordPress: Tools > Export > Media > Download Export File

import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
;(async () => {
  console.log('Starting migration')
  // const awaitedConfig = await importConfig('./src/payload.config.ts')
  // const payload = await getPayload({ config: awaitedConfig })

  const xmlData = fs.readFileSync('./data/media.xml', 'utf8')

  const parser = new XMLParser()
  const wpData = parser.parse(xmlData)

  // const mediaItems = wpData.rss.channel.item

  for (const mediaItem of wpData.rss.channel.item) {
    console.log(mediaItem.guid)
  }
})()
