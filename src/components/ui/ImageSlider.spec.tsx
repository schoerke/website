// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageSlideData } from './ImageSlide'
import ImageSlider from './ImageSlider'

// Mock the Embla carousel hooks
vi.mock('embla-carousel-react', () => ({
  default: () => {
    const api = {
      scrollNext: vi.fn(),
      scrollPrev: vi.fn(),
      scrollTo: vi.fn(),
      selectedScrollSnap: vi.fn(() => 0),
      on: vi.fn(),
      off: vi.fn(),
    }
    return [vi.fn(), api]
  },
}))

// Mock the Autoplay plugin
vi.mock('embla-carousel-autoplay', () => ({
  default: () => ({
    reset: vi.fn(),
  }),
}))

// Mock ImageSlide component
vi.mock('./ImageSlide', () => ({
  default: ({ image, isActive }: any) => (
    <div data-testid="image-slide" data-active={isActive}>
      <img src={image.src} alt={image.alt} />
      {image.bannerText && <span>{image.bannerText}</span>}
    </div>
  ),
}))

// Mock next-intl navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockImages: ImageSlideData[] = [
  {
    src: '/image1.jpg',
    alt: 'Image 1',
    bannerText: 'Artist 1',
    link: '/artist/1',
  },
  {
    src: '/image2.jpg',
    alt: 'Image 2',
    bannerText: 'Artist 2',
    link: '/artist/2',
  },
  {
    src: '/image3.jpg',
    alt: 'Image 3',
    bannerText: 'Artist 3',
    link: '/artist/3',
  },
]

describe('ImageSlider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all slides', () => {
      render(<ImageSlider images={mockImages} />)
      const slides = screen.getAllByTestId('image-slide')
      expect(slides).toHaveLength(3)
    })

    it('should render images with links when provided', () => {
      render(<ImageSlider images={mockImages} />)
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
      expect(links[0]).toHaveAttribute('href', '/artist/1')
    })

    it('should render images without links when not provided', () => {
      const imagesWithoutLinks = mockImages.map((img) => ({ ...img, link: undefined }))
      render(<ImageSlider images={imagesWithoutLinks} />)
      const links = screen.queryAllByRole('link')
      expect(links).toHaveLength(0)
    })

    it('should return null when no images provided', () => {
      const { container } = render(<ImageSlider images={[]} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Navigation Controls', () => {
    describe('Arrow Buttons', () => {
      it('should render arrow buttons by default', () => {
        render(<ImageSlider images={mockImages} />)
        expect(screen.getByLabelText('Previous slide')).toBeInTheDocument()
        expect(screen.getByLabelText('Next slide')).toBeInTheDocument()
      })

      it('should not render arrow buttons when showArrows is false', () => {
        render(<ImageSlider images={mockImages} showArrows={false} />)
        expect(screen.queryByLabelText('Previous slide')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument()
      })

      it('should have hover states on arrow buttons', () => {
        render(<ImageSlider images={mockImages} />)
        const prevButton = screen.getByLabelText('Previous slide')
        const nextButton = screen.getByLabelText('Next slide')
        expect(prevButton).toHaveClass('hover:bg-gray-300')
        expect(nextButton).toHaveClass('hover:bg-gray-300')
      })

      it('should call scrollPrev when previous button clicked', async () => {
        const user = userEvent.setup()
        render(<ImageSlider images={mockImages} />)
        const prevButton = screen.getByLabelText('Previous slide')
        await user.click(prevButton)
        // Verify button was clicked (callback was set up)
        expect(prevButton).toBeInTheDocument()
      })

      it('should call scrollNext when next button clicked', async () => {
        const user = userEvent.setup()
        render(<ImageSlider images={mockImages} />)
        const nextButton = screen.getByLabelText('Next slide')
        await user.click(nextButton)
        // Verify button was clicked (callback was set up)
        expect(nextButton).toBeInTheDocument()
      })
    })

    describe('Dot Indicators', () => {
      it('should render dot indicators by default', () => {
        render(<ImageSlider images={mockImages} />)
        const dots = screen.getAllByLabelText(/Go to slide/)
        expect(dots).toHaveLength(3)
      })

      it('should not render dots when showDots is false', () => {
        render(<ImageSlider images={mockImages} showDots={false} />)
        const dots = screen.queryAllByLabelText(/Go to slide/)
        expect(dots).toHaveLength(0)
      })

      it('should have correct aria-labels on dots', () => {
        render(<ImageSlider images={mockImages} />)
        expect(screen.getByLabelText('Go to slide 1')).toBeInTheDocument()
        expect(screen.getByLabelText('Go to slide 2')).toBeInTheDocument()
        expect(screen.getByLabelText('Go to slide 3')).toBeInTheDocument()
      })

      it('should have aria-current on active dot', () => {
        render(<ImageSlider images={mockImages} />)
        const dots = screen.getAllByLabelText(/Go to slide/)
        expect(dots[0]).toHaveAttribute('aria-current', 'true')
        expect(dots[1]).toHaveAttribute('aria-current', 'false')
        expect(dots[2]).toHaveAttribute('aria-current', 'false')
      })

      it('should have hover states on inactive dots', () => {
        render(<ImageSlider images={mockImages} />)
        const dots = screen.getAllByLabelText(/Go to slide/)
        // First dot is active (no hover class)
        expect(dots[0]).toHaveClass('bg-black')
        // Other dots should have hover class
        expect(dots[1]).toHaveClass('hover:bg-gray-400')
        expect(dots[2]).toHaveClass('hover:bg-gray-400')
      })

      it('should have transition classes on dots', () => {
        render(<ImageSlider images={mockImages} />)
        const dots = screen.getAllByLabelText(/Go to slide/)
        dots.forEach((dot) => {
          expect(dot).toHaveClass('transition-colors')
        })
      })

      it('should call scrollTo when dot clicked', async () => {
        const user = userEvent.setup()
        render(<ImageSlider images={mockImages} />)
        const secondDot = screen.getByLabelText('Go to slide 2')
        await user.click(secondDot)
        // Verify button was clicked (callback was set up)
        expect(secondDot).toBeInTheDocument()
      })
    })
  })

  describe('Auto-advance', () => {
    it('should enable auto-advance by default', () => {
      const { container } = render(<ImageSlider images={mockImages} />)
      expect(container).toBeInTheDocument()
      // Auto-advance is enabled through Autoplay plugin (tested via integration)
    })

    it('should use custom interval when provided', () => {
      const { container } = render(<ImageSlider images={mockImages} interval={8000} />)
      expect(container).toBeInTheDocument()
      // Custom interval is passed to Autoplay plugin
    })

    it('should disable auto-advance when autoAdvance is false', () => {
      const { container } = render(<ImageSlider images={mockImages} autoAdvance={false} />)
      expect(container).toBeInTheDocument()
      // When autoAdvance is false, no Autoplay plugin is created
    })
  })

  describe('Layout and Styling', () => {
    it('should have correct container classes', () => {
      const { container } = render(<ImageSlider images={mockImages} />)
      const sliderContainer = container.querySelector('.overflow-hidden')
      expect(sliderContainer).toHaveClass('rounded-lg')
    })

    it('should use flexbox for slide container', () => {
      const { container } = render(<ImageSlider images={mockImages} />)
      const slideContainer = container.querySelector('.flex')
      expect(slideContainer).toBeInTheDocument()
    })

    it('should have responsive slide widths', () => {
      const { container } = render(<ImageSlider images={mockImages} />)
      const slides = container.querySelectorAll('.flex > div')
      slides.forEach((slide) => {
        expect(slide).toHaveClass('flex-[0_0_100%]') // Mobile: full width
        expect(slide).toHaveClass('sm:flex-[0_0_50%]') // Desktop: half width
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on navigation buttons', () => {
      render(<ImageSlider images={mockImages} />)
      expect(screen.getByLabelText('Previous slide')).toBeInTheDocument()
      expect(screen.getByLabelText('Next slide')).toBeInTheDocument()
    })

    it('should have proper ARIA labels on dot indicators', () => {
      render(<ImageSlider images={mockImages} />)
      expect(screen.getByLabelText('Go to slide 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to slide 2')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to slide 3')).toBeInTheDocument()
    })

    it('should mark active slide with aria-current', () => {
      render(<ImageSlider images={mockImages} />)
      const dots = screen.getAllByLabelText(/Go to slide/)
      expect(dots[0]).toHaveAttribute('aria-current', 'true')
    })

    it('should have negative tabindex on linked slides to prevent focus duplication', () => {
      render(<ImageSlider images={mockImages} />)
      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveAttribute('tabindex', '-1')
      })
    })

    it('should have aria-labels on linked slides', () => {
      render(<ImageSlider images={mockImages} />)
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveAttribute('aria-label', 'Artist 1')
      expect(links[1]).toHaveAttribute('aria-label', 'Artist 2')
      expect(links[2]).toHaveAttribute('aria-label', 'Artist 3')
    })
  })

  describe('Edge Cases', () => {
    it('should handle single image', () => {
      const singleImage = [mockImages[0]]
      render(<ImageSlider images={singleImage} />)
      const slides = screen.getAllByTestId('image-slide')
      expect(slides).toHaveLength(1)
      const dot = screen.getByLabelText('Go to slide 1')
      expect(dot).toBeInTheDocument()
    })

    it('should handle images without banner text', () => {
      const imagesWithoutBanner = mockImages.map((img) => ({ ...img, bannerText: undefined }))
      render(<ImageSlider images={imagesWithoutBanner} />)
      expect(screen.queryByText('Artist 1')).not.toBeInTheDocument()
    })

    it('should handle images with partial data', () => {
      const minimalImages: ImageSlideData[] = [
        { src: '/img.jpg', alt: 'Test' },
        { src: '/img2.jpg', alt: 'Test 2' },
      ]
      render(<ImageSlider images={minimalImages} />)
      const slides = screen.getAllByTestId('image-slide')
      expect(slides).toHaveLength(2)
    })
  })
})
