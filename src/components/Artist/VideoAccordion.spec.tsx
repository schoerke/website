// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import VideoAccordion from './VideoAccordion'

describe('VideoAccordion', () => {
  const mockVideos = [
    { id: '1', label: 'Performance 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id: '2', label: 'Performance 2', url: 'https://youtu.be/jNQXAC9IVRw' },
    { id: '3', label: 'Performance 3', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
  ]

  beforeAll(() => {
    // Mock iframe element to prevent happy-dom network requests
    const originalCreateElement = document.createElement.bind(document)
    document.createElement = function (tagName: string, options?: ElementCreationOptions) {
      if (tagName.toLowerCase() === 'iframe') {
        const div = originalCreateElement('div', options) as unknown as HTMLIFrameElement
        div.setAttribute('data-mock-iframe', 'true')
        // Intercept src attribute to prevent network requests
        Object.defineProperty(div, 'src', {
          get() {
            return this.getAttribute('src') || ''
          },
          set(value: string) {
            this.setAttribute('src', value)
          },
        })
        // Mock allow attribute
        Object.defineProperty(div, 'allow', {
          get() {
            return this.getAttribute('allow') || ''
          },
          set(value: string) {
            this.setAttribute('allow', value)
          },
        })
        return div
      }
      return originalCreateElement(tagName, options)
    }
  })

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('Empty state', () => {
    it('should render empty message when no videos', () => {
      const emptyMessage = 'No videos available'
      render(<VideoAccordion videos={[]} emptyMessage={emptyMessage} />)

      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    })

    it('should render centered empty state', () => {
      render(<VideoAccordion videos={[]} emptyMessage="No videos" />)

      const emptyState = screen.getByText('No videos').parentElement
      expect(emptyState).toHaveClass('py-12', 'text-center', 'text-gray-500')
    })
  })

  describe('Video rendering', () => {
    it('should render all video labels', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      expect(screen.getByText('Performance 1')).toBeInTheDocument()
      expect(screen.getByText('Performance 2')).toBeInTheDocument()
      expect(screen.getByText('Performance 3')).toBeInTheDocument()
    })

    it('should render accordion buttons for each video', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })

    it('should not render iframes initially (all closed)', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const iframes = screen.queryAllByTitle(/Performance/)
      expect(iframes).toHaveLength(0)
    })
  })

  describe('Accordion interaction', () => {
    it('should open accordion when button is clicked', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstButton = screen.getByRole('button', { name: /Performance 1/i })
      await user.click(firstButton)

      expect(screen.getByTitle('Performance 1')).toBeInTheDocument()
    })

    it('should close accordion when clicked again', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstButton = screen.getByRole('button', { name: /Performance 1/i })

      // Open
      await user.click(firstButton)
      expect(screen.getByTitle('Performance 1')).toBeInTheDocument()

      // Close
      await user.click(firstButton)
      expect(screen.queryByTitle('Performance 1')).not.toBeInTheDocument()
    })

    it('should close previous accordion when opening a new one', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      // Open first video
      const firstButton = screen.getByRole('button', { name: /Performance 1/i })
      await user.click(firstButton)
      expect(screen.getByTitle('Performance 1')).toBeInTheDocument()

      // Open second video (should close first)
      const secondButton = screen.getByRole('button', { name: /Performance 2/i })
      await user.click(secondButton)

      expect(screen.queryByTitle('Performance 1')).not.toBeInTheDocument()
      expect(screen.getByTitle('Performance 2')).toBeInTheDocument()
    })

    it('should update aria-expanded attribute', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstButton = screen.getByRole('button', { name: /Performance 1/i })

      expect(firstButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(firstButton)
      expect(firstButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('YouTube URL parsing', () => {
    it('should extract video ID from standard YouTube URL', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Test') as HTMLIFrameElement
      expect(iframe.src).toContain('dQw4w9WgXcQ')
    })

    it('should extract video ID from short YouTube URL', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://youtu.be/jNQXAC9IVRw' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Test') as HTMLIFrameElement
      expect(iframe.src).toContain('jNQXAC9IVRw')
    })

    it('should extract video ID from embed URL', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/embed/9bZkp7q19f0' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Test') as HTMLIFrameElement
      expect(iframe.src).toContain('9bZkp7q19f0')
    })

    it('should handle direct video ID', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Test') as HTMLIFrameElement
      expect(iframe.src).toContain('dQw4w9WgXcQ')
    })

    it('should skip videos with invalid URLs', () => {
      const videos = [
        { label: 'Valid', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { label: 'Invalid', url: 'https://example.com/not-a-video' },
      ]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      expect(screen.getByText('Valid')).toBeInTheDocument()
      expect(screen.queryByText('Invalid')).not.toBeInTheDocument()
      expect(console.warn).toHaveBeenCalledWith('Invalid YouTube URL: https://example.com/not-a-video')
    })
  })

  describe('Iframe attributes', () => {
    it('should set correct iframe attributes', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test Video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Test Video') as HTMLIFrameElement
      expect(iframe).toHaveAttribute('allowFullScreen')
      expect(iframe.allow).toContain('accelerometer')
      expect(iframe.allow).toContain('autoplay')
      expect(iframe.allow).toContain('encrypted-media')
    })

    it('should use video label as iframe title', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'My Custom Title', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(screen.getByTitle('My Custom Title')).toBeInTheDocument()
    })
  })

  describe('Visual feedback', () => {
    it('should rotate chevron icon when accordion is open', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      const { container } = render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      const svg = container.querySelector('svg')

      // Initially not rotated
      expect(svg).not.toHaveClass('rotate-180')

      // After opening, should be rotated
      await user.click(button)
      expect(svg).toHaveClass('rotate-180')
    })
  })

  describe('Edge cases', () => {
    it('should handle videos without id property', () => {
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('should use index as fallback key when id is null', () => {
      const videos = [{ id: null, label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('should handle URL with query parameters', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Test') as HTMLIFrameElement
      expect(iframe.src).toContain('dQw4w9WgXcQ')
    })
  })
})
