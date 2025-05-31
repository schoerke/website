import config from '@payload-config'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import mime from 'mime'
import { getPayload } from 'payload'

const migrateMedia = async () => {
  console.log('Starting migration')
  const payload = await getPayload({ config })
  const xmlData = fs.readFileSync('./media.xml', 'utf8')

  const parser = new XMLParser()
  const wpData = parser.parse(xmlData)
  const mediaItems = wpData.rss.channel.item

  mediaItems.forEach(async (mediaItem, index) => {
    console.log(`[${index + 1}]: ${mediaItem.guid}`)
    const response = await fetch(mediaItem.guid)

    if (response.status !== 200) {
      console.log(`Skipping ${mediaItem.guid}, failed to fetch`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))

    await payload.create({
      collection: 'media',
      data: {
        alt: mediaItem.alt ?? 'MISSING ALT TEXT',
      },
      file: {
        data: buffer,
        mimetype: mime.getType(mediaItem.guid.split('?')[0].split('/').pop()),
        name: mediaItem.guid.split('?')[0].split('/').pop(),
        size: buffer.length,
      },
    })
  })
}

migrateMedia()
