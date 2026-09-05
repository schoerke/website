import type { CollectionBeforeDeleteHook } from 'payload'
import { APIError } from 'payload'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { blockReferencedImageDelete } from './blockReferencedImageDelete'

type HookArgs = Parameters<CollectionBeforeDeleteHook>[0]

const imageId = 42

const queryOptions = {
  limit: 1,
  pagination: false,
  depth: 0,
  select: {},
}

const referenceQueries = [
  { index: 0, query: { collection: 'artists', where: { image: { equals: imageId } } } },
  {
    index: 1,
    query: { collection: 'artists', where: { 'galleryImages.image': { equals: imageId } } },
  },
  { index: 2, query: { collection: 'employees', where: { image: { equals: imageId } } } },
  {
    index: 3,
    query: {
      collection: 'posts',
      where: { and: [{ image: { equals: imageId } }, { _status: { equals: 'published' } }] },
    },
  },
  { index: 4, query: { collection: 'recordings', where: { coverArt: { equals: imageId } } } },
] as const

function createHookArgs(find: Mock): HookArgs {
  return {
    id: imageId,
    req: { payload: { find } } as unknown as HookArgs['req'],
    collection: { slug: 'images' } as HookArgs['collection'],
    context: {},
  }
}

function runHook(find: Mock = vi.fn().mockResolvedValue({ docs: [] })) {
  return {
    find,
    result: blockReferencedImageDelete(createHookArgs(find)),
  }
}

describe('blockReferencedImageDelete', () => {
  it.each(referenceQueries)(
    'blocks deletion when $collection.$where references the image',
    async ({ index, query }) => {
      const find = vi.fn()
      for (let resultIndex = 0; resultIndex < index; resultIndex += 1) {
        find.mockResolvedValueOnce({ docs: [] })
      }
      find.mockResolvedValueOnce({ docs: [{ id: 'reference-1' }] })

      const { result } = runHook(find)

      await expect(result).rejects.toMatchObject({
        message: 'This image is in use and cannot be deleted. Remove or replace it first.',
        status: 400,
        isPublic: true,
      })
      expect(find).toHaveBeenCalledTimes(index + 1)
      expect(find).toHaveBeenNthCalledWith(index + 1, {
        ...query,
        ...queryOptions,
      })
    }
  )

  it('throws a public APIError with status 400', async () => {
    const { result } = runHook(vi.fn().mockResolvedValue({ docs: [{ id: 'reference-1' }] }))

    try {
      await result
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(APIError)
      const apiError = err as APIError
      expect(apiError.status).toBe(400)
      expect(apiError.isPublic).toBe(true)
      expect(apiError.message).toBe('This image is in use and cannot be deleted. Remove or replace it first.')
    }
  })

  it('allows deletion when no collection references the image', async () => {
    const { find, result } = runHook()

    await expect(result).resolves.toBeUndefined()
    expect(find).toHaveBeenCalledTimes(5)
    expect(find).toHaveBeenNthCalledWith(1, { ...referenceQueries[0].query, ...queryOptions })
    expect(find).toHaveBeenNthCalledWith(2, { ...referenceQueries[1].query, ...queryOptions })
    expect(find).toHaveBeenNthCalledWith(3, { ...referenceQueries[2].query, ...queryOptions })
    expect(find).toHaveBeenNthCalledWith(4, { ...referenceQueries[3].query, ...queryOptions })
    expect(find).toHaveBeenNthCalledWith(5, { ...referenceQueries[4].query, ...queryOptions })
  })
})
