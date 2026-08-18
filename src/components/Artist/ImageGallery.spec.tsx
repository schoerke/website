// @vitest-environment happy-dom

import { createMockImage } from '@/tests/utils/payloadMocks'
import type { GalleryImage } from './artistTypes'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ImageGallery from './ImageGallery'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onLoad,
    onError,
  }: {
    src: string
    alt: string
    onLoad?: () => void
    onError?: () => void
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onLoad={onLoad} onError={onError} />
  ),
}))

vi.mock('./ImageLightbox', () => ({
  default: () => <div data-testid="image-lightbox" />,
}))

describe('ImageGallery', () => {
  it('renders the real image when an item has one', () => {
    const items: GalleryImage[] = [
      { id: '1', image: createMockImage({ url: 'https://example.com/gallery-1.jpg', alt: 'Gallery photo' }) },
    ]

    render(<ImageGallery images={items} emptyMessage="No images" />)

    const img = screen.getByAltText('Gallery photo')
    expect(img).toHaveAttribute('src', 'https://example.com/gallery-1.jpg')
  })

  it('renders an Image icon placeholder when the item has no image', () => {
    const items: GalleryImage[] = [{ id: '1', image: null as never }]

    render(<ImageGallery images={items} emptyMessage="No images" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('gallery-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to the Image icon placeholder when the image fails to load', () => {
    const items: GalleryImage[] = [
      { id: '1', image: createMockImage({ url: 'https://example.com/gallery-1.jpg', alt: 'Gallery photo' }) },
    ]

    render(<ImageGallery images={items} emptyMessage="No images" />)

    fireEvent.error(screen.getByAltText('Gallery photo'))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('gallery-image-placeholder')).toBeInTheDocument()
  })
})
