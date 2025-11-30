import type { Artist, Employee, Image, Post, Recording } from '@/payload-types'
import type { PaginatedDocs } from '@/types/payload'

/**
 * Creates a mock Post object for testing purposes.
 *
 * @param overrides - Optional partial Post properties to override defaults
 * @returns A complete mock Post object with sensible defaults
 */
export function createMockPost(overrides?: Partial<Post>): Post {
  return {
    id: '1',
    title: 'Test Post',
    slug: 'test-post',
    content: {
      root: {
        type: 'root',
        children: [],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    },
    category: 'news',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    _status: 'published',
    ...overrides,
  } as Post
}

/**
 * Creates a mock Artist object for testing purposes.
 *
 * @param overrides - Optional partial Artist properties to override defaults
 * @returns A complete mock Artist object with sensible defaults
 */
export function createMockArtist(overrides?: Partial<Artist>): Artist {
  return {
    id: '1',
    name: 'Test Artist',
    slug: 'test-artist',
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    _status: 'published',
    ...overrides,
  } as Artist
}

/**
 * Creates a mock Image object for testing purposes.
 *
 * @param overrides - Optional partial Image properties to override defaults
 * @returns A complete mock Image object with sensible defaults
 */
export function createMockImage(overrides?: Partial<Image>): Image {
  return {
    id: 1,
    alt: 'Test Image',
    filename: 'test-image.jpg',
    mimeType: 'image/jpeg',
    filesize: 1024,
    width: 800,
    height: 600,
    url: '/api/images/file/test-image.jpg',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Image
}

/**
 * @deprecated Use createMockImage instead. Media collection was split into Images and Documents.
 */
export const createMockMedia = createMockImage

/**
 * Creates a mock Recording object for testing purposes.
 *
 * @param overrides - Optional partial Recording properties to override defaults
 * @returns A complete mock Recording object with sensible defaults
 */
export function createMockRecording(overrides?: Partial<Recording>): Recording {
  return {
    id: '1',
    title: 'Test Recording',
    slug: 'test-recording',
    artists: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    _status: 'published',
    ...overrides,
  } as Recording
}

/**
 * Creates a mock Employee object for testing purposes.
 *
 * @param overrides - Optional partial Employee properties to override defaults
 * @returns A complete mock Employee object with sensible defaults
 */
export function createMockEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: '1',
    name: 'John Doe',
    position: 'Artist Manager',
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Employee
}

/**
 * Creates a mock PaginatedDocs response for testing Payload find() operations.
 *
 * @param docs - Array of documents to include in the response
 * @param overrides - Optional partial PaginatedDocs properties to override defaults
 * @returns A complete mock PaginatedDocs object
 */
export function createMockPaginatedDocs<T>(docs: T[], overrides?: Partial<PaginatedDocs<T>>): PaginatedDocs<T> {
  return {
    docs,
    totalDocs: docs.length,
    limit: 10,
    totalPages: 1,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: false,
    prevPage: undefined,
    nextPage: undefined,
    ...overrides,
  }
}
