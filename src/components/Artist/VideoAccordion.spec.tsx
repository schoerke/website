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

    it('should render first video iframe open by default', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstPanel = document.getElementById('video-panel-1')
      expect(firstPanel).not.toHaveAttribute('hidden')
    })

    it('should render subsequent video panels hidden by default', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const secondPanel = document.getElementById('video-panel-2')
      const thirdPanel = document.getElementById('video-panel-3')
      expect(secondPanel).toHaveAttribute('hidden')
      expect(thirdPanel).toHaveAttribute('hidden')
    })
  })

  describe('Accordion interaction', () => {
    it('should open accordion when button is clicked', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      // First is already open; open the second
      const secondButton = screen.getByRole('button', { name: /Performance 2/i })
      await user.click(secondButton)

      const secondPanel = document.getElementById('video-panel-2')
      expect(secondPanel).not.toHaveAttribute('hidden')
    })

    it('should close accordion when clicked again', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstButton = screen.getByRole('button', { name: /Performance 1/i })
      const firstPanel = document.getElementById('video-panel-1')

      // First starts open
      expect(firstPanel).not.toHaveAttribute('hidden')

      // Click to close
      await user.click(firstButton)
      expect(firstPanel).toHaveAttribute('hidden')
    })

    it('should close previous accordion when opening a new one', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstPanel = document.getElementById('video-panel-1')
      const secondPanel = document.getElementById('video-panel-2')

      // First starts open
      expect(firstPanel).not.toHaveAttribute('hidden')
      expect(secondPanel).toHaveAttribute('hidden')

      // Open second video (should close first)
      const secondButton = screen.getByRole('button', { name: /Performance 2/i })
      await user.click(secondButton)

      expect(firstPanel).toHaveAttribute('hidden')
      expect(secondPanel).not.toHaveAttribute('hidden')
    })

    it('should update aria-expanded attribute', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstButton = screen.getByRole('button', { name: /Performance 1/i })

      // First starts open
      expect(firstButton).toHaveAttribute('aria-expanded', 'true')

      // Click to close
      await user.click(firstButton)
      expect(firstButton).toHaveAttribute('aria-expanded', 'false')
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
      expect(console.warn).toHaveBeenCalledWith('Unsupported video URL: https://example.com/not-a-video')
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

      // Initially open (first item opens by default)
      expect(svg).toHaveClass('rotate-180')

      // After closing, should not be rotated
      await user.click(button)
      expect(svg).not.toHaveClass('rotate-180')
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

  describe('arte.tv URL support', () => {
    it('should render arte.tv video with correct embed URL', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Arte Concert', url: 'https://www.arte.tv/de/videos/120894-000-A/some-title/' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Arte Concert') as HTMLIFrameElement
      expect(iframe.src).toContain('arte.tv/embeds/de/120894-000-A')
    })

    it('should extract locale from arte.tv URL', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Arte FR', url: 'https://www.arte.tv/fr/videos/120894-000-A/some-title/' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Arte FR') as HTMLIFrameElement
      expect(iframe.src).toContain('/embeds/fr/')
    })

    it('should disable autoplay for arte.tv embeds', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Arte Test', url: 'https://www.arte.tv/de/videos/120894-000-A/title/' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const iframe = screen.getByTitle('Arte Test') as HTMLIFrameElement
      expect(iframe.src).toContain('autoplay=false')
    })
  })
})
