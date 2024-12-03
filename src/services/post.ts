import config from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

export const getAllPosts = async () => {
  return await payload.find({
    collection: 'posts',
  })
}

export const getAllNewsPosts = async () => {
  return await payload.find({
    collection: 'artists',
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

export const getAllProjectPosts = async () => {
  return await payload.find({
    collection: 'artists',
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

export const getAllHomepagePosts = async () => {
  return await payload.find({
    collection: 'artists',
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
