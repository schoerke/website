import type { Payload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

export const getArtists = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'artists',
    locale: locale || 'de',
  })
}

export const getArtistById = async (payload: Payload, id: string, locale?: LocaleCode) => {
  return await payload.findByID({
    collection: 'artists',
    id: id,
    locale: locale || 'de',
  })
}

// Fetch only the fields needed for the artist list page
export const getArtistListData = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'artists',
    select: {
      name: true,
      image: true,
      instrument: true,
      id: true,
      slug: true,
    },
    locale: locale || 'de',
  })
}
