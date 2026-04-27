import { createMockPost } from '@/tests/utils/payloadMocks'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePostSlugInLocale } from './posts'

// Mock the post service
vi.mock('@/services/post', () => ({
  getFilteredPosts: vi.fn(),
  getPostBySlug: vi.fn(),
  getPostSlugByIdAndLocale: vi.fn(),
}))

describe('resolvePostSlugInLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the target locale slug when the post exists', async () => {
    const { getPostBySlug, getPostSlugByIdAndLocale } = await import('@/services/post')
    vi.mocked(getPostBySlug).mockResolvedValue(createMockPost({ id: 42, slug: 'konzert-in-wien' }))
    vi.mocked(getPostSlugByIdAndLocale).mockResolvedValue('concert-in-vienna')

    const result = await resolvePostSlugInLocale('konzert-in-wien', 'de', 'en')

    expect(getPostBySlug).toHaveBeenCalledWith('konzert-in-wien', 'de')
    expect(getPostSlugByIdAndLocale).toHaveBeenCalledWith(42, 'en')
    expect(result).toBe('concert-in-vienna')
  })

  it('returns null when the post does not exist in the current locale', async () => {
    const { getPostBySlug } = await import('@/services/post')
    vi.mocked(getPostBySlug).mockResolvedValue(null)

    const result = await resolvePostSlugInLocale('unknown-slug', 'de', 'en')

    expect(result).toBeNull()
  })

  it('returns null when the target locale has no slug', async () => {
    const { getPostBySlug, getPostSlugByIdAndLocale } = await import('@/services/post')
    vi.mocked(getPostBySlug).mockResolvedValue(createMockPost({ id: 42 }))
    vi.mocked(getPostSlugByIdAndLocale).mockResolvedValue(null)

    const result = await resolvePostSlugInLocale('some-slug', 'de', 'en')

    expect(result).toBeNull()
  })

  it('works in the reverse direction (en → de)', async () => {
    const { getPostBySlug, getPostSlugByIdAndLocale } = await import('@/services/post')
    vi.mocked(getPostBySlug).mockResolvedValue(createMockPost({ id: 99, slug: 'concert-in-vienna' }))
    vi.mocked(getPostSlugByIdAndLocale).mockResolvedValue('konzert-in-wien')

    const result = await resolvePostSlugInLocale('concert-in-vienna', 'en', 'de')

    expect(getPostBySlug).toHaveBeenCalledWith('concert-in-vienna', 'en')
    expect(getPostSlugByIdAndLocale).toHaveBeenCalledWith(99, 'de')
    expect(result).toBe('konzert-in-wien')
  })

  it('passes through service errors', async () => {
    const { getPostBySlug } = await import('@/services/post')
    vi.mocked(getPostBySlug).mockRejectedValue(new Error('Database error'))

    await expect(resolvePostSlugInLocale('some-slug', 'de', 'en')).rejects.toThrow('Database error')
  })
})
