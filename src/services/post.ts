import type { Payload } from 'payload'

export const getAllPosts = async (payload: Payload) => {
  return await payload.find({
    collection: 'posts',
  })
}

export const getAllNewsPosts = async (payload: Payload) => {
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
  })
}

export const getAllProjectPosts = async (payload: Payload) => {
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
  })
}

export const getAllHomepagePosts = async (payload: Payload) => {
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
  })
}

export const getAllNewsPostsByArtist = async (payload: Payload, artistId: string) => {
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
  })
}

export const getAllProjectPostsByArtist = async (payload: Payload, artistId: string) => {
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
  })
}
