import type { Payload } from 'payload'

type LocaleCode = 'de' | 'en' | 'all'

export const getAllPosts = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    locale: locale || 'de',
  })
}

export const getAllNewsPosts = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'news',
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

export const getAllProjectPosts = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'projects',
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

export const getAllHomepagePosts = async (payload: Payload, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'home',
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

export const getAllNewsPostsByArtist = async (payload: Payload, artistId: string, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'news',
      },
      artists: {
        contains: artistId,
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}

export const getAllProjectPostsByArtist = async (payload: Payload, artistId: string, locale?: LocaleCode) => {
  return await payload.find({
    collection: 'posts',
    where: {
      categories: {
        equals: 'projects',
      },
      artists: {
        contains: artistId,
      },
      published: {
        equals: true,
      },
    },
    locale: locale || 'de',
  })
}
