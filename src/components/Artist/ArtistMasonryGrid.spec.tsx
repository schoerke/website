// @vitest-environment happy-dom

import type { Artist } from '@/payload-types'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockImage } from '@/tests/utils/payloadMocks'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ArtistMasonryGrid from './ArtistMasonryGrid'

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

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: unknown; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'}>{children}</a>
  ),
}))

function createMockArtist(overrides?: Partial<Artist>): Artist {
  return {
    id: 1,
    name: 'Jane Artist',
    slug: 'jane-artist',
    instrument: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Artist
}

const renderGrid = (artists: Artist[]) => render(<NextIntlTestProvider>{<ArtistMasonryGrid artists={artists} />}</NextIntlTestProvider>)

describe('ArtistMasonryGrid', () => {
  it('renders the real image when the artist has one', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    const img = screen.getByAltText('Jane Artist')
    expect(img).toHaveAttribute('src', 'https://example.com/jane.jpg')
  })

  it('renders a UserRound icon placeholder when the artist has no image', () => {
    const artist = createMockArtist({ image: null as never })
    renderGrid([artist])

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('artist-masonry-image-placeholder')).toBeInTheDocument()
  })

  it('falls back to a UserRound icon placeholder when the image fails to load', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    fireEvent.error(screen.getByAltText('Jane Artist'))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('artist-masonry-image-placeholder')).toBeInTheDocument()
  })
})
