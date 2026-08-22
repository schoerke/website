/* @vitest-environment jsdom */
import { vi } from 'vitest'

const isEnabled = { current: false }
const mockDraftMode = vi.fn().mockImplementation(() => Promise.resolve({ isEnabled: isEnabled.current }))

vi.mock('next/headers', () => ({ draftMode: () => mockDraftMode() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn() }))

vi.mock('@/services/post', () => ({ getPostBySlug: vi.fn() }))
vi.mock('@/components/Post/PostPreviewClient', () => ({
  default: () => <div data-testid="post-preview" />,
}))
vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn().mockImplementation(() => (key: string) => key),
  setRequestLocale: vi.fn(),
}))

import { getPostBySlug } from '@/services/post'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { notFound } from 'next/navigation'
import PreviewPage from './page'

const makeParams = (slug = 'draft-post', locale = 'de') => Promise.resolve({ slug, locale })

const mockPost = {
  id: 1,
  title: 'Draft Post',
  slug: 'draft-post',
  categories: ['news'],
  content: {} as never,
  createdAt: '2026-01-01T00:00:00.000Z',
  image: null,
  artists: [],
  createdBy: 1,
}

describe('PreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isEnabled.current = false
    vi.mocked(getPostBySlug).mockResolvedValue(mockPost as never)
    vi.mocked(notFound).mockClear()
  })

  it('calls notFound when draft mode is not enabled', async () => {
    await PreviewPage({ params: makeParams() })

    expect(notFound).toHaveBeenCalled()
    expect(getPostBySlug).not.toHaveBeenCalled()
  })

  it('fetches with draft: true when draft mode is enabled', async () => {
    isEnabled.current = true

    await PreviewPage({ params: makeParams() })

    expect(getPostBySlug).toHaveBeenCalledWith('draft-post', 'de', { draft: true })
  })

  it('renders PostPreviewClient with the fetched post', async () => {
    isEnabled.current = true

    render(await PreviewPage({ params: makeParams() }))

    expect(screen.getByTestId('post-preview')).toBeInTheDocument()
  })

  it('fetches a project-category post when draft mode enabled', async () => {
    isEnabled.current = true
    vi.mocked(getPostBySlug).mockResolvedValue({ ...mockPost, categories: ['projects'] } as never)

    await PreviewPage({ params: makeParams() })
    expect(getPostBySlug).toHaveBeenCalledWith('draft-post', 'de', { draft: true })
  })
})
