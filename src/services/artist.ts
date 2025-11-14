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

// Fetch only the fields needed for the artist list page
export const getArtistListData = async (payload: Payload) => {
  return await payload.find({
    collection: 'artists',
    select: {
      name: true,
      image: true,
      instrument: true,
      id: true,
      slug: true,
    },
  })
}
