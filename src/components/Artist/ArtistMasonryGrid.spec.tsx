// @vitest-environment happy-dom

import type { Artist } from '@/payload-types'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { createMockImage } from '@/tests/utils/payloadMocks'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArtistMasonryGrid from './ArtistMasonryGrid'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
    style,
    onLoad,
    onError,
  }: {
    src: string
    alt: string
    className?: string
    style?: React.CSSProperties
    onLoad?: () => void
    onError?: () => void
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} onError={onError} />
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

const renderGrid = (artists: Artist[]) =>
  render(<NextIntlTestProvider>{<ArtistMasonryGrid artists={artists} />}</NextIntlTestProvider>)

describe('ArtistMasonryGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the real image when the artist has one', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    const img = screen.getByAltText('Jane Artist')
    expect(img).toHaveAttribute('src', 'https://example.com/jane.jpg')
  })

  it('reserves the image box with the Payload aspect ratio before the image loads', () => {
    const artist = createMockArtist({
      image: createMockImage({ url: 'https://example.com/jane.jpg', width: 900, height: 1200 }) as never,
    })
    renderGrid([artist])

    const img = screen.getByAltText('Jane Artist') as HTMLElement
    expect(img).toHaveStyle({ aspectRatio: '900 / 1200' })
  })

  it('falls back to a 3:4 aspect ratio when image dimensions are unknown', () => {
    const artist = createMockArtist({
      image: { url: 'https://example.com/jane.jpg' } as unknown as never,
    })
    renderGrid([artist])

    const img = screen.getByAltText('Jane Artist') as HTMLElement
    expect(img).toHaveStyle({ aspectRatio: '3 / 4' })
  })

  it('keeps the skeleton out of the flow so it does not double the item height', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    const skeleton = document.getElementsByClassName('animate-pulse')[0] as Element
    expect(skeleton).toHaveClass('absolute', 'inset-0')
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

  it('fades the hover overlay out when scrolling starts', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    const nameHeading = screen.getByText('Jane Artist')
    const overlay = nameHeading.parentElement as HTMLElement
    const img = screen.getByAltText('Jane Artist') as HTMLElement

    expect(overlay).toHaveClass('group-hover:translate-y-0', 'group-hover:opacity-100')
    expect(img).toHaveClass('object-cover')
    expect(img).not.toHaveClass('group-hover:scale-105')

    act(() => {
      fireEvent(window, new Event('wheel'))
    })

    // Overlay keeps its transition for a smooth fade-out but loses the
    // hover-triggered classes
    expect(overlay).toHaveClass('translate-y-2', 'opacity-0', 'transition-all', 'duration-300')
    expect(overlay).not.toHaveClass('group-hover:translate-y-0', 'group-hover:opacity-100')
    expect(img).toHaveClass('object-cover')
    expect(img).not.toHaveClass('group-hover:scale-105')
  })

  it('re-enables hover effects once scrolling has been idle', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    const nameHeading = screen.getByText('Jane Artist')
    const overlay = nameHeading.parentElement as HTMLElement

    act(() => {
      fireEvent(window, new Event('wheel'))
    })
    expect(overlay).not.toHaveClass('group-hover:translate-y-0')

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(overlay).toHaveClass('group-hover:translate-y-0', 'group-hover:opacity-100')
  })
})
