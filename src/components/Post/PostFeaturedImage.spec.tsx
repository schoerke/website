// @vitest-environment happy-dom

import PostFeaturedImage from '@/components/Post/PostFeaturedImage'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock next/image so the real optimizer config (images.qualities) isn't loaded in tests —
// the quality={80} prop would otherwise warn "not configured in images.qualities [75]".
vi.mock('next/image', () => ({
  default: ({ src, alt, onLoad, onError, priority: _priority, fill: _fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src as string} alt={alt} onLoad={onLoad} onError={onError} {...props} />
  ),
}))

describe('PostFeaturedImage', () => {
  it('renders the real image when a valid src is provided', () => {
    render(<PostFeaturedImage src="/api/images/file/post-cover.jpg" alt="Post cover" />)

    const img = screen.getByRole('img', { name: 'Post cover' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', expect.stringContaining('post-cover.jpg'))
  })

  it('applies the image focal point as object-position', () => {
    render(
      <PostFeaturedImage src="/api/images/file/post-cover.jpg" alt="Post cover" focalX={42} focalY={68} />
    )

    const img = screen.getByRole('img', { name: 'Post cover' })
    expect(img).toHaveStyle('object-position: 42% 68%')
  })

  it('renders a UserRound icon placeholder when src is null', () => {
    render(<PostFeaturedImage src={null} alt="Post cover" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('post-featured-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to the UserRound icon placeholder when the image fails to load', () => {
    render(<PostFeaturedImage src="/api/images/file/post-cover.jpg" alt="Post cover" />)

    fireEvent.error(screen.getByRole('img'))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('post-featured-image-placeholder')).toBeInTheDocument()
  })
})
