// @vitest-environment happy-dom
import type { Post } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PostPreviewClient from './PostPreviewClient'

let liveData: Partial<Post>

vi.mock('@payloadcms/live-preview-react', () => ({
  useLivePreview: () => ({ data: liveData }),
}))

const mockPostDetailContent = vi.fn()

vi.mock('@/components/Post/PostDetailContent', () => ({
  default: (props: Record<string, unknown>) => {
    mockPostDetailContent(props)
    return (
      <div data-testid="post-detail">
        {String(props.title)}
        {Array.isArray(props.relatedArtists) && props.relatedArtists.length ? 'has-artists' : ''}
        {typeof props.imageUrl === 'string' && props.imageUrl ? 'has-image' : ''}
      </div>
    )
  },
}))

const baseLiveData: Partial<Post> = {
  title: 'Draft Title',
  content: {} as Post['content'],
  slug: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  image: { url: '/draft-image.jpg' } as Post['image'],
  artists: [
    { id: 1, slug: 'artist-one', name: 'Artist One' },
    { id: 2, slug: 'artist-two', name: 'Artist Two' },
  ] as Post['artists'],
}

const basePost = {
  id: 1,
  title: 'Initial Title',
  slug: 'draft',
  content: {} as Post['content'],
  createdAt: '2026-01-01T00:00:00.000Z',
  categories: ['news'],
  artists: [],
  image: { url: '/img.jpg' } as Post['image'],
  createdBy: 1,
  updatedAt: '2026-01-01T00:00:00.000Z',
} as Post

const baseProps = {
  initialData: basePost,
  locale: 'en' as const,
  backHref: '/news',
  backLabel: 'All News',
  backButtonLabel: 'Go back',
  relatedArtistLabel: 'Related Artist',
  relatedArtistsLabel: 'Related Artists',
}

describe('PostPreviewClient', () => {
  beforeEach(() => {
    liveData = { ...baseLiveData }
    mockPostDetailContent.mockClear()
  })

  it('renders PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(screen.getByTestId('post-detail')).toBeInTheDocument()
  })

  it('propagates live data from useLivePreview to PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(screen.getByTestId('post-detail')).toHaveTextContent('Draft Title')
  })

  it('translates image and artists from live preview data before passing to PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(screen.getByTestId('post-detail')).toHaveTextContent('has-image')
    expect(screen.getByTestId('post-detail')).toHaveTextContent('has-artists')
  })

  it('passes every translated prop to PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(mockPostDetailContent).toHaveBeenCalledTimes(1)
    const props = mockPostDetailContent.mock.calls[0][0] as Record<string, unknown>

    expect(props.title).toBe('Draft Title')
    expect(props.locale).toBe('en')
    expect(props.backHref).toBe('/news')
    expect(props.backLabel).toBe('All News')
    expect(props.backButtonLabel).toBe('Go back')
    expect(props.relatedArtistLabel).toBe('Related Artist')
    expect(props.relatedArtistsLabel).toBe('Related Artists')
    expect(props.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(props.content).toEqual({})
    expect(props.imageUrl).toBe('/draft-image.jpg')
    expect(props.relatedArtists).toHaveLength(2)
  })

  it('drops unpopulated ID-only relations', () => {
    liveData = { ...baseLiveData, artists: [1, 2], image: 5 }
    render(<PostPreviewClient {...baseProps} />)
    expect(screen.getByTestId('post-detail')).not.toHaveTextContent('has-artists')
    expect(screen.getByTestId('post-detail')).not.toHaveTextContent('has-image')
  })
})
