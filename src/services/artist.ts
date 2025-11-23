import type { Payload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

export const getArtists = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'artists',
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
}

export const getArtistById = async (payload: Payload, id: string, locale?: LocaleCode) => {
  return await payload.findByID({
    collection: 'artists',
    id: id,
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
}

export const getArtistBySlug = async (payload: Payload, slug: string, locale?: LocaleCode) => {
  const result = await payload.find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    limit: 1,
    locale: locale || 'de',
    fallbackLocale: 'de',
  })
  return result.docs[0]
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
    fallbackLocale: 'de',
  })
}
