// @vitest-environment happy-dom
import type { Post } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PostPreviewClient from './PostPreviewClient'

let lastProps: Record<string, unknown> | null = null

vi.mock('@payloadcms/live-preview-react', () => ({
  useLivePreview: () => ({
    data: {
      title: 'Draft Title',
      content: {},
      slug: 'draft',
      image: { url: '/draft-image.jpg' },
      artists: [
        { id: 1, slug: 'artist-one', name: 'Artist One' },
        { id: 2, slug: 'artist-two', name: 'Artist Two' },
      ],
    },
  }),
}))

vi.mock('@/components/Post/PostDetailContent', () => ({
  default: (props: Record<string, unknown>) => {
    lastProps = props
    return (
      <div data-testid="post-detail">
        {String(props.title)}
        {Array.isArray(props.relatedArtists) && props.relatedArtists.length ? 'has-artists' : ''}
        {typeof props.imageUrl === 'string' && props.imageUrl ? 'has-image' : ''}
      </div>
    )
  },
}))

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

  it('passes translated imageUrl and relatedArtists props to PostDetailContent', () => {
    render(<PostPreviewClient {...baseProps} />)
    expect(lastProps).not.toBeNull()
    const translated = lastProps as { imageUrl: string | null; relatedArtists: unknown[] }
    expect(translated.imageUrl).toBe('/draft-image.jpg')
    expect(Array.isArray(translated.relatedArtists)).toBe(true)
    expect(translated.relatedArtists.length).toBe(2)
  })
})
