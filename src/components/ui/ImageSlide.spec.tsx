// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ImageSlide, { ImageSlideData } from './ImageSlide'

const mockImage: ImageSlideData = {
  src: '/test-image.jpg',
  alt: 'Test Image',
  bannerText: 'Test Banner',
  sizesAttr: '(max-width: 768px) 100vw, 50vw',
  focalX: 50,
  focalY: 50,
}

describe('ImageSlide', () => {
  describe('Rendering', () => {
    it('should render image with correct src and alt', () => {
      render(<ImageSlide image={mockImage} isActive={true} />)
      const img = screen.getByAltText('Test Image')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('alt', 'Test Image')
    })

    it('should render banner text when provided', () => {
      render(<ImageSlide image={mockImage} isActive={true} />)
      expect(screen.getByText('Test Banner')).toBeInTheDocument()
    })

    it('should not render banner text when not provided', () => {
      const imageWithoutBanner = { ...mockImage, bannerText: undefined }
      render(<ImageSlide image={imageWithoutBanner} isActive={true} />)
      expect(screen.queryByText('Test Banner')).not.toBeInTheDocument()
    })
  })

  describe('Opacity Behavior', () => {
    it('should have full opacity when active', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const slideDiv = container.firstChild as HTMLElement
      expect(slideDiv).toHaveClass('opacity-100')
    })

    it('should have reduced opacity when inactive', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={false} />)
      const slideDiv = container.firstChild as HTMLElement
      expect(slideDiv).toHaveClass('opacity-60')
    })

    it('should have transition classes for smooth opacity changes', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const slideDiv = container.firstChild as HTMLElement
      expect(slideDiv).toHaveClass('transition-opacity')
      expect(slideDiv).toHaveClass('duration-300')
    })
  })

  describe('Focal Point', () => {
    it('should apply focal point as object-position when provided', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img.style.objectPosition).toBe('50% 50%')
    })

    it('should use center position when focal point is not provided', () => {
      const imageWithoutFocal = { ...mockImage, focalX: null, focalY: null }
      const { container } = render(<ImageSlide image={imageWithoutFocal} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img.style.objectPosition).toBe('center')
    })

    it('should use center position when focal point is partially missing', () => {
      const imageWithPartialFocal = { ...mockImage, focalX: 50, focalY: null }
      const { container } = render(<ImageSlide image={imageWithPartialFocal} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img.style.objectPosition).toBe('center')
    })
  })

  describe('Image Error Handling', () => {
    it('should render a UserRound icon placeholder when src is null', () => {
      render(<ImageSlide image={{ ...mockImage, src: null }} isActive={true} />)

      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.getByTestId('image-slide-placeholder')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct container dimensions', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const slideDiv = container.firstChild as HTMLElement
      expect(slideDiv).toHaveClass('h-72') // Mobile height
      expect(slideDiv).toHaveClass('md:h-96') // Desktop height
      expect(slideDiv).toHaveClass('w-full')
    })

    it('should have relative positioning for banner overlay', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const slideDiv = container.firstChild as HTMLElement
      expect(slideDiv).toHaveClass('relative')
    })

    it('should apply object-cover to image', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveClass('object-cover')
    })

    it('should have rounded corners on image', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveClass('rounded-lg')
    })
  })

  describe('Banner Styling', () => {
    it('should position banner overlay across the slide', () => {
      render(<ImageSlide image={mockImage} isActive={true} />)
      const overlay = screen.getByTestId('image-slide-banner')
      expect(overlay).toHaveClass('absolute')
      expect(overlay).toHaveClass('inset-0')
      expect(overlay).toHaveClass('items-end')
    })

    it('should have gradient scrim overlay like artist cards', () => {
      render(<ImageSlide image={mockImage} isActive={true} />)
      const overlay = screen.getByTestId('image-slide-banner')
      expect(overlay).toHaveClass('bg-gradient-to-t')
      expect(overlay).toHaveClass('from-black/70')
    })

    it('should style banner text like artist card names', () => {
      render(<ImageSlide image={mockImage} isActive={true} />)
      const text = screen.getByText('Test Banner')
      expect(text).toHaveClass('font-playfair')
      expect(text).not.toHaveClass('italic')
    })
  })

  describe('Performance Attributes', () => {
    it('should use lazy loading by default', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('loading', 'lazy')
    })

    it('should use eager loading when specified', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} loading="eager" />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('loading', 'eager')
    })

    it('should use lazy loading when specified', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} loading="lazy" />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('loading', 'lazy')
    })

    it('should use provided sizes attribute', () => {
      const { container } = render(<ImageSlide image={mockImage} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('sizes', '(max-width: 768px) 100vw, 50vw')
    })

    it('should use default sizes when not provided', () => {
      const imageWithoutSizes = { ...mockImage, sizesAttr: undefined }
      const { container } = render(<ImageSlide image={imageWithoutSizes} isActive={true} />)
      const img = container.querySelector('img') as HTMLImageElement
      expect(img).toHaveAttribute('sizes', '(max-width: 768px) 100vw, 50vw')
    })
  })
})
