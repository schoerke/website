import config from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

export const getArtists = async () => {
  return await payload.find({
    collection: 'artists',
  })
}

export const getArtistById = async (id: string) => {
  return await payload.findByID({
    collection: 'artists',
    id: id,
  })
}
