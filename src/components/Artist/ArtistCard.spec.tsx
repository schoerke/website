// @vitest-environment happy-dom
import { NextIntlTestProvider } from '@/components/__test-utils__/NextIntlProvider'
import type { Image as PayloadImage } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ArtistCard from './ArtistCard'

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onError,
    style,
  }: {
    src: string
    alt: string
    onError?: () => void
    style?: React.CSSProperties
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} style={style} data-testid="artist-image" />
  ),
}))

// Mock @/i18n/navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, className }: { href: any; children: React.ReactNode; className?: string }) => (
    <a href={typeof href === 'string' ? href : `/artists/${href.params?.slug}`} className={className}>
      {children}
    </a>
  ),
}))

const testMessages = {
  custom: {
    instruments: {
      Piano: 'Piano',
      Violin: 'Violin',
      Cello: 'Cello',
      Flute: 'Flute',
    },
  },
}

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<NextIntlTestProvider messages={testMessages}>{ui}</NextIntlTestProvider>)
}

const createMockImage = (overrides?: Partial<PayloadImage>): PayloadImage => ({
  id: 1,
  alt: 'Artist photo',
  updatedAt: '2023-01-01T00:00:00.000Z',
  createdAt: '2023-01-01T00:00:00.000Z',
  url: 'https://example.com/artist.jpg',
  thumbnailURL: null,
  filename: 'artist.jpg',
  mimeType: 'image/jpeg',
  filesize: 100000,
  width: 800,
  height: 600,
  focalX: 50,
  focalY: 50,
  sizes: {
    thumbnail: {
      url: 'https://example.com/artist-thumbnail.jpg',
      width: 400,
      height: 300,
      mimeType: 'image/jpeg',
      filesize: 50000,
      filename: 'artist-thumbnail.jpg',
    },
    tablet: {
      url: 'https://example.com/artist-tablet.jpg',
      width: 1024,
      height: 768,
      mimeType: 'image/jpeg',
      filesize: 150000,
      filename: 'artist-tablet.jpg',
    },
  },
  ...overrides,
})

describe('ArtistCard', () => {
  const defaultProps = {
    id: '1',
    name: 'John Doe',
    instrument: ['Piano', 'Violin'],
    slug: 'john-doe',
  }

  describe('Rendering', () => {
    it('should render artist name', () => {
      renderWithIntl(<ArtistCard {...defaultProps} />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should render translated instruments', () => {
      renderWithIntl(<ArtistCard {...defaultProps} />)
      // The NextIntlTestProvider returns the key as-is, so we check for the raw translation keys
      expect(screen.getByText('Piano, Violin')).toBeInTheDocument()
    })

    it('should render without instruments', () => {
      renderWithIntl(<ArtistCard {...defaultProps} instrument={undefined} />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      // Should have empty instruments text
      const instrumentText = screen.getByText('John Doe').parentElement?.querySelector('.text-sm')
      expect(instrumentText?.textContent).toBe('')
    })

    it('should render with empty instruments array', () => {
      renderWithIntl(<ArtistCard {...defaultProps} instrument={[]} />)
      const instrumentText = screen.getByText('John Doe').parentElement?.querySelector('.text-sm')
      expect(instrumentText?.textContent).toBe('')
    })
  })

  describe('Link behavior', () => {
    it('should render as link when slug is provided', () => {
      renderWithIntl(<ArtistCard {...defaultProps} />)
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/artists/john-doe')
    })

    it('should render as div when slug is not provided', () => {
      renderWithIntl(<ArtistCard {...defaultProps} slug={undefined} />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      // Should still render the content
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Image handling', () => {
    it('should render image with PayloadImage object', () => {
      const image = createMockImage()
      renderWithIntl(<ArtistCard {...defaultProps} image={image} />)

      const img = screen.getByTestId('artist-image')
      expect(img).toBeInTheDocument()
      // Should use tablet size URL
      expect(img).toHaveAttribute('src', 'https://example.com/artist-tablet.jpg')
      expect(img).toHaveAttribute('alt', 'John Doe')
    })

    it('should use default avatar when image is null', () => {
      renderWithIntl(<ArtistCard {...defaultProps} image={null} />)

      const img = screen.getByTestId('artist-image')
      expect(img).toHaveAttribute('src', '/api/images/file/default-avatar.webp')
    })

    it('should use default avatar when image is undefined', () => {
      renderWithIntl(<ArtistCard {...defaultProps} image={undefined} />)

      const img = screen.getByTestId('artist-image')
      expect(img).toHaveAttribute('src', '/api/images/file/default-avatar.webp')
    })

    it('should use default avatar when image is a number (ID only)', () => {
      renderWithIntl(<ArtistCard {...defaultProps} image={123} />)

      const img = screen.getByTestId('artist-image')
      expect(img).toHaveAttribute('src', '/api/images/file/default-avatar.webp')
    })

    it('should use default avatar when image URL is invalid', () => {
      const image = createMockImage({ url: 'null', sizes: {} })
      renderWithIntl(<ArtistCard {...defaultProps} image={image} />)

      const img = screen.getByTestId('artist-image')
      expect(img).toHaveAttribute('src', '/api/images/file/default-avatar.webp')
    })

    it('should fall back to main URL when tablet size is not available', () => {
      const image = createMockImage({ sizes: {} })
      renderWithIntl(<ArtistCard {...defaultProps} image={image} />)

      const img = screen.getByTestId('artist-image')
      expect(img).toHaveAttribute('src', 'https://example.com/artist.jpg')
    })
  })

  describe('Focal point positioning', () => {
    it('should apply custom focal point from image', () => {
      const image = createMockImage({ focalX: 30, focalY: 70 })
      renderWithIntl(<ArtistCard {...defaultProps} image={image} />)

      const imageContainer = screen.getByTestId('artist-image')
      expect(imageContainer).toHaveStyle({ objectPosition: '30% 70%' })
    })

    it('should use default focal point (50%, 50%) when not specified', () => {
      const image = createMockImage({ focalX: undefined, focalY: undefined })
      renderWithIntl(<ArtistCard {...defaultProps} image={image} />)

      const imageContainer = screen.getByTestId('artist-image')
      expect(imageContainer).toHaveStyle({ objectPosition: '50% 50%' })
    })

    it('should use default focal point when image is not an object', () => {
      renderWithIntl(<ArtistCard {...defaultProps} image={null} />)

      const imageContainer = screen.getByTestId('artist-image')
      expect(imageContainer).toHaveStyle({ objectPosition: '50% 50%' })
    })
  })

  describe('Error handling', () => {
    it('should handle image loading errors', () => {
      renderWithIntl(<ArtistCard {...defaultProps} image={createMockImage()} />)

      const img = screen.getByTestId('artist-image') as HTMLImageElement
      const errorHandler = vi.fn()
      img.onerror = errorHandler

      // Simulate image error
      img.dispatchEvent(new Event('error'))

      // Should fall back to static avatar
      expect(img.src).toContain('/assets/default-avatar.webp')
    })
  })

  describe('CSS classes and styling', () => {
    it('should apply hover scale on link variant', () => {
      renderWithIntl(<ArtistCard {...defaultProps} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('hover:scale-[1.02]')
    })

    it('should apply hover scale on non-link variant', () => {
      const { container } = renderWithIntl(<ArtistCard {...defaultProps} slug={undefined} />)

      const card = container.querySelector('.group')
      expect(card).toHaveClass('hover:scale-[1.02]')
    })

    it('should have aspect ratio 4:3', () => {
      const { container } = renderWithIntl(<ArtistCard {...defaultProps} />)

      const imageContainer = container.querySelector('.relative.h-72')
      expect(imageContainer).toHaveStyle({ aspectRatio: '4 / 3' })
    })
  })

  describe('Accessibility', () => {
    it('should have proper alt text for image', () => {
      renderWithIntl(<ArtistCard {...defaultProps} />)

      const img = screen.getByAltText('John Doe')
      expect(img).toBeInTheDocument()
    })

    it('should render semantic heading', () => {
      renderWithIntl(<ArtistCard {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('John Doe')
    })
  })
})
