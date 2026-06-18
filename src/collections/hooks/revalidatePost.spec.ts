import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePostOnChange, revalidatePostOnDelete } from './revalidatePost'
import type { Post } from '@/payload-types'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'

type ChangeHookArgs = Parameters<CollectionAfterChangeHook<Post>>[0]
type DeleteHookArgs = Parameters<CollectionAfterDeleteHook<Post>>[0]

// Helper to cast partial test args via unknown — full hook args have many required fields not needed here
const asChangeArgs = (args: unknown) => args as ChangeHookArgs
const asDeleteArgs = (args: unknown) => args as DeleteHookArgs

const createMockReq = (context = {}, slugMap: Record<string, string> = {}): PayloadRequest => {
  return {
    context,
    payload: {
      findByID: vi.fn(({ locale }: { locale: string }) =>
        Promise.resolve({ slug: slugMap[locale] ?? `test-slug-${locale}` })
      ),
    },
  } as unknown as PayloadRequest
}

const createMockPost = (overrides: Partial<Post> = {}): Post =>
  ({
    id: 1,
    title: 'Test Post',
    slug: 'test-slug',
    _status: 'published',
    categories: ['news'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }) as Post

describe('revalidatePost hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('revalidatePostOnChange', () => {
    it('revalidates detail pages using resolved URL paths (not route group paths)', async () => {
      const req = createMockReq({}, { de: 'mein-artikel', en: 'my-article' })
      const doc = createMockPost({ _status: 'published', categories: ['news'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc: undefined, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/news/mein-artikel')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news/my-article')
      // Must NOT use route group hybrid paths
      const calls = vi.mocked(revalidatePath).mock.calls.map(([p]) => p)
      expect(calls.every((p) => !p.includes('(frontend)'))).toBe(true)
    })

    it('revalidates list pages for affected categories', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', categories: ['news'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc: undefined, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/news')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news')
    })

    it('revalidates list pages for projects category', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', categories: ['projects'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc: undefined, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/projects')
      expect(revalidatePath).toHaveBeenCalledWith('/en/projects')
    })

    it('skips when both current and previous doc are drafts', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'draft' })
      const previousDoc = createMockPost({ _status: 'draft' })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc, req }))

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('revalidates when transitioning from draft to published', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', categories: ['news'] })
      const previousDoc = createMockPost({ _status: 'draft' })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/news')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news')
    })

    it('revalidates when transitioning from published to draft (unpublish)', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'draft', categories: ['news'] })
      const previousDoc = createMockPost({ _status: 'published', categories: ['news'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/news')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news')
    })

    it('unions current and previous categories on category change', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', categories: ['projects'] })
      const previousDoc = createMockPost({ _status: 'published', categories: ['news'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc, req }))

      // Both old and new list pages revalidated
      expect(revalidatePath).toHaveBeenCalledWith('/de/news')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news')
      expect(revalidatePath).toHaveBeenCalledWith('/de/projects')
      expect(revalidatePath).toHaveBeenCalledWith('/en/projects')
    })

    it('skips categories not mapped to routes', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', categories: ['unknown-category' as 'news'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc: undefined, req }))

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('skips revalidation when skipRevalidation context flag is set', async () => {
      const req = createMockReq({ skipRevalidation: true })
      const doc = createMockPost({ _status: 'published', categories: ['news'] })

      await revalidatePostOnChange(asChangeArgs({ doc, previousDoc: undefined, req }))

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('returns doc', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', categories: ['news'] })

      const result = await revalidatePostOnChange(asChangeArgs({ doc, previousDoc: undefined, req }))

      expect(result).toBe(doc)
    })
  })

  describe('revalidatePostOnDelete', () => {
    it('revalidates detail pages using resolved URL paths for both locales', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', slug: 'my-post', categories: ['news'] })

      await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/news/my-post')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news/my-post')
    })

    it('revalidates list pages on delete', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', slug: 'my-post', categories: ['news'] })

      await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      expect(revalidatePath).toHaveBeenCalledWith('/de/news')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news')
    })

    it('skips when doc is not published', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'draft', slug: 'my-post', categories: ['news'] })

      await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('skips when slug is missing', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', slug: undefined, categories: ['news'] })

      await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      // List pages still revalidated even without slug
      expect(revalidatePath).toHaveBeenCalledWith('/de/news')
      expect(revalidatePath).toHaveBeenCalledWith('/en/news')
      const calls = vi.mocked(revalidatePath).mock.calls.map(([p]) => p)
      expect(calls.some((p) => p.match(/\/news\/.+/))).toBe(false)
    })

    it('skips revalidation when skipRevalidation context flag is set', async () => {
      const req = createMockReq({ skipRevalidation: true })
      const doc = createMockPost({ _status: 'published', slug: 'my-post', categories: ['news'] })

      await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('must not use route group hybrid paths', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', slug: 'my-post', categories: ['news'] })

      await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      const calls = vi.mocked(revalidatePath).mock.calls.map(([p]) => p)
      expect(calls.every((p) => !p.includes('(frontend)'))).toBe(true)
      expect(calls.every((p) => !p.includes('[locale]'))).toBe(true)
    })

    it('returns doc', async () => {
      const req = createMockReq()
      const doc = createMockPost({ _status: 'published', slug: 'my-post', categories: ['news'] })

      const result = await revalidatePostOnDelete(asDeleteArgs({ doc, req }))

      expect(result).toBe(doc)
    })
  })
})
