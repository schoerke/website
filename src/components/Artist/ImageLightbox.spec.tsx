// @vitest-environment happy-dom

import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockImage } from '@/tests/utils/payloadMocks'
import type { GalleryImage } from './artistTypes'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ImageLightbox from './ImageLightbox'

vi.mock('next/image', () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}))

vi.mock('embla-carousel-react', () => ({
  default: () => [() => {}, undefined],
}))

const messages = {
  custom: {
    pages: {
      artist: {
        media: {
          galleryTitle: 'Gallery',
          previousImage: 'Previous image',
          nextImage: 'Next image',
        },
      },
    },
  },
}

function renderLightbox(images: GalleryImage[]) {
  return render(
    <NextIntlTestProvider messages={messages}>
      <ImageLightbox images={images} initialIndex={0} open={true} onClose={() => {}} />
    </NextIntlTestProvider>
  )
}

describe('ImageLightbox', () => {
  it('renders the real image when an item has one', () => {
    const images: GalleryImage[] = [
      { id: '1', image: createMockImage({ url: 'https://example.com/gallery-1.jpg', alt: 'Gallery photo' }) },
    ]

    renderLightbox(images)

    const img = screen.getByAltText('Gallery photo')
    expect(img).toHaveAttribute('src', 'https://example.com/gallery-1.jpg?v=2024-01-01T00%3A00%3A00.000Z')
  })

  it('renders an Image icon placeholder when the item has no image', () => {
    const images: GalleryImage[] = [{ id: '1', image: null as never }]

    renderLightbox(images)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('lightbox-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to the Image icon placeholder when the image fails to load', () => {
    const images: GalleryImage[] = [
      { id: '1', image: createMockImage({ url: 'https://example.com/gallery-1.jpg', alt: 'Gallery photo' }) },
    ]

    renderLightbox(images)

    fireEvent.error(screen.getByAltText('Gallery photo'))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('lightbox-image-placeholder')).toBeInTheDocument()
  })
})
