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
  Link: ({
    href,
    children,
    onClick,
    onMouseEnter,
    onFocus,
    onTouchStart,
  }: {
    href: unknown
    children: React.ReactNode
    onClick?: () => void
    onMouseEnter?: () => void
    onFocus?: () => void
    onTouchStart?: () => void
  }) => (
    <a
      href={
        typeof href === 'string'
          ? href
          : `/artists/${(href as { params?: { slug?: string }; hash?: string }).params?.slug}${
              (href as { hash?: string }).hash ? `#${(href as { hash?: string }).hash}` : ''
            }`
      }
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onTouchStart={onTouchStart}
    >
      {children}
    </a>
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
    expect(img).toHaveAttribute('src', 'https://example.com/jane.jpg?v=2024-01-01T00%3A00%3A00.000Z')
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

  it('links artists to their detail page without a hash, so navigation scrolls to the top', () => {
    const artist = createMockArtist({ id: 7, slug: 'jane-artist' })
    renderGrid([artist])

    // No `#biography` hash: ArtistTabs already defaults to the biography tab without one, and a
    // hash with no matching element on the target page makes Next.js skip scroll-to-top.
    expect(screen.getByRole('link', { name: /Jane Artist/ })).toHaveAttribute('href', '/artists/jane-artist')
  })

  it('does not preload the artist detail page image before the user shows intent to visit', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    // Only the grid thumbnail itself should be present — no extra preload image yet.
    expect(document.querySelectorAll('img')).toHaveLength(1)
  })

  it('preloads the artist detail page image once the user hovers the card', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    fireEvent.mouseEnter(screen.getByRole('link', { name: /Jane Artist/ }))

    const images = document.querySelectorAll('img')
    expect(images).toHaveLength(2)
    // Both point at the exact same source image so the browser reuses the same cache entry
    // the detail page's featured image will request.
    expect(images[1]).toHaveAttribute('src', 'https://example.com/jane.jpg?v=2024-01-01T00%3A00%3A00.000Z')
  })

  it('does NOT preload on focus alone, to avoid fetching a full hero image for every card a keyboard user tabs past', () => {
    const artist = createMockArtist({ image: createMockImage({ url: 'https://example.com/jane.jpg' }) as never })
    renderGrid([artist])

    fireEvent.focus(screen.getByRole('link', { name: /Jane Artist/ }))

    expect(document.querySelectorAll('img')).toHaveLength(1)
  })
})
