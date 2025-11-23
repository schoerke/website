import type { Artist, Employee, Media, Post, Recording } from '@/payload-types'
import type { PaginatedDocs } from 'payload'

/**
 * Creates a mock PaginatedDocs response with sensible defaults.
 * Only provide the fields you care about in your test.
 *
 * @example
 * ```ts
 * // Empty result
 * mockPayload.find.mockResolvedValue(createMockPaginatedDocs([]))
 *
 * // Single result
 * mockPayload.find.mockResolvedValue(createMockPaginatedDocs([mockArtist]))
 *
 * // Custom pagination
 * mockPayload.find.mockResolvedValue(
 *   createMockPaginatedDocs([mockArtist], { totalDocs: 100, page: 2 })
 * )
 * ```
 */
export function createMockPaginatedDocs<T>(docs: T[], overrides: Partial<PaginatedDocs<T>> = {}): PaginatedDocs<T> {
  return {
    docs,
    totalDocs: docs.length,
    limit: 10,
    totalPages: Math.ceil(docs.length / 10) || 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: null,
    nextPage: null,
    ...overrides,
  }
}

/**
 * Creates a minimal mock Artist with sensible defaults.
 * Only provide the fields you care about in your test.
 *
 * @example
 * ```ts
 * const artist = createMockArtist()
 * const pianist = createMockArtist({ name: 'John Doe', instrument: ['piano'] })
 * ```
 */
export function createMockArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 1,
    name: 'Test Artist',
    slug: 'test-artist',
    instrument: ['piano'],
    biography: 'Test biography',
    image: 1,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artist
}

/**
 * Creates a minimal mock Employee with sensible defaults.
 * Only provide the fields you care about in your test.
 *
 * @example
 * ```ts
 * const employee = createMockEmployee()
 * const manager = createMockEmployee({ name: 'Jane Doe', title: 'Manager' })
 * ```
 */
export function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    name: 'John Doe',
    title: 'Artist Manager',
    email: 'john@example.com',
    phone: '+1234567890',
    order: 1,
    image: 1,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Employee
}

/**
 * Creates a minimal mock Media with sensible defaults.
 * Only provide the fields you care about in your test.
 *
 * @example
 * ```ts
 * const media = createMockMedia()
 * const logo = createMockMedia({ filename: 'logo.png', alt: 'Company Logo' })
 * ```
 */
export function createMockMedia(overrides: Partial<Media> = {}): Media {
  return {
    id: 1,
    filename: 'test-image.png',
    alt: 'Test Image',
    url: 'https://example.com/test-image.png',
    mimeType: 'image/png',
    filesize: 1024,
    width: 100,
    height: 100,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Media
}

/**
 * Creates a minimal mock Post with sensible defaults.
 * Only provide the fields you care about in your test.
 *
 * @example
 * ```ts
 * const post = createMockPost()
 * const newsPost = createMockPost({ categories: ['news'], published: true })
 * ```
 */
export function createMockPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    title: 'Test Post',
    slug: 'test-post',
    categories: ['news'],
    published: true,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Post
}

/**
 * Creates a minimal mock Recording with sensible defaults.
 * Only provide the fields you care about in your test.
 *
 * @example
 * ```ts
 * const recording = createMockRecording()
 * const album = createMockRecording({ title: 'Beethoven Symphony No. 9' })
 * ```
 */
export function createMockRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 1,
    title: 'Test Recording',
    _status: 'published',
    artists: [1] as any,
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Recording
}
