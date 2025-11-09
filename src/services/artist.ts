import type { Payload } from 'payload'

export const getArtists = async (payload: Payload) => {
  return await payload.find({
    collection: 'artists',
  })
}

export const getArtistById = async (payload: Payload, id: string) => {
  return await payload.findByID({
    collection: 'artists',
    id: id,
  })
}
