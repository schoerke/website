// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VideoAccordion from './VideoAccordion'

// VideoAccordion delegates iframe rendering to <VideoEmbed> (which has its own
// spec). Stub it so these tests stay focused on accordion mechanics while still
// asserting the url/embedCode props it receives.
vi.mock('@/components/blocks/VideoEmbed', () => ({
  default: ({ url, embedCode }: { url?: string; embedCode?: string }) => (
    <div data-testid="video-embed" data-url={url ?? ''} data-embed-code={embedCode ?? ''} />
  ),
}))

describe('VideoAccordion', () => {
  const mockVideos = [
    { id: '1', label: 'Performance 1', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id: '2', label: 'Performance 2', url: 'https://youtu.be/jNQXAC9IVRw' },
    { id: '3', label: 'Performance 3', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
  ]

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

    it('should render first video open by default', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstPanel = document.getElementById('video-panel-1')
      expect(firstPanel).not.toHaveAttribute('hidden')
      expect(screen.getAllByTestId('video-embed')).toHaveLength(1)
    })

    it('should render subsequent video panels hidden by default', () => {
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const secondPanel = document.getElementById('video-panel-2')
      const thirdPanel = document.getElementById('video-panel-3')
      expect(secondPanel).toHaveStyle({ visibility: 'hidden' })
      expect(thirdPanel).toHaveStyle({ visibility: 'hidden' })
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
      expect(screen.getAllByTestId('video-embed')).toHaveLength(2)
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
      expect(firstPanel).toHaveStyle({ visibility: 'hidden' })
    })

    it('should close previous accordion when opening a new one', async () => {
      const user = userEvent.setup()
      render(<VideoAccordion videos={mockVideos} emptyMessage="No videos" />)

      const firstPanel = document.getElementById('video-panel-1')
      const secondPanel = document.getElementById('video-panel-2')

      // First starts open
      expect(firstPanel).not.toHaveStyle({ visibility: 'hidden' })
      expect(secondPanel).toHaveStyle({ visibility: 'hidden' })

      // Open second video (should close first)
      const secondButton = screen.getByRole('button', { name: /Performance 2/i })
      await user.click(secondButton)

      expect(firstPanel).toHaveStyle({ visibility: 'hidden' })
      expect(secondPanel).not.toHaveStyle({ visibility: 'hidden' })
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

  describe('YouTube URL pass-through', () => {
    it('should pass standard YouTube URL to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(embed).toHaveAttribute('data-embed-code', '')
    })

    it('should pass short YouTube URL to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://youtu.be/jNQXAC9IVRw' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://youtu.be/jNQXAC9IVRw')
    })

    it('should pass YouTube embed URL to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/embed/9bZkp7q19f0' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/embed/9bZkp7q19f0')
    })

    it('should pass YouTube live URL with share params to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/live/S3ozsKGx864?si=rXYcx6VPNwbLIxx3' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/live/S3ozsKGx864?si=rXYcx6VPNwbLIxx3')
    })

    it('should pass YouTube shorts URL to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/shorts/9bZkp7q19f0' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/shorts/9bZkp7q19f0')
    })

    it('should pass YouTube live URL with trailing slash to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/live/S3ozsKGx864/' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/live/S3ozsKGx864/')
    })

    it('should pass bare video ID to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'dQw4w9WgXcQ' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'dQw4w9WgXcQ')
    })

    it('should pass URL with query parameters to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Test', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')
    })

    it('should skip live URL with extra path segments', () => {
      const videos = [
        { label: 'Valid', url: 'https://www.youtube.com/live/S3ozsKGx864' },
        { label: 'Invalid', url: 'https://www.youtube.com/live/S3ozsKGx864/stats' },
      ]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      expect(screen.getByText('Valid')).toBeInTheDocument()
      expect(screen.queryByText('Invalid')).not.toBeInTheDocument()
      expect(console.warn).toHaveBeenCalledWith('Unsupported video URL: https://www.youtube.com/live/S3ozsKGx864/stats')
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

  describe('Embed code support', () => {
    it('should pass embed code to VideoEmbed when url is empty', async () => {
      const user = userEvent.setup()
      const embedCode = '<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761"></iframe>'
      const videos = [{ label: 'RSI Concert', url: '', embedCode }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', '')
      expect(embed).toHaveAttribute('data-embed-code', embedCode)
    })

    it('should render embed code video open by default', () => {
      const videos = [{ label: 'RSI Concert', url: '', embedCode: '<iframe src="https://www.rsi.ch/play/x"></iframe>' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-embed-code', '<iframe src="https://www.rsi.ch/play/x"></iframe>')
    })

    it('should prefer embed code over url when both are set', async () => {
      const user = userEvent.setup()
      const videos = [
        {
          label: 'Both',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedCode: '<iframe src="https://www.rsi.ch/play/x"></iframe>',
        },
      ]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(embed).toHaveAttribute('data-embed-code', '<iframe src="https://www.rsi.ch/play/x"></iframe>')
    })

    it('should skip videos with neither url nor embed code', () => {
      const videos = [{ label: 'Broken', url: '', embedCode: null }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      expect(screen.queryByText('Broken')).not.toBeInTheDocument()
      expect(console.warn).toHaveBeenCalledWith('Unsupported video URL: ')
    })
  })

  describe('arte.tv URL pass-through', () => {
    it('should pass arte.tv video URL to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Arte Concert', url: 'https://www.arte.tv/de/videos/120894-000-A/some-title/' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.arte.tv/de/videos/120894-000-A/some-title/')
    })

    it('should pass arte.tv French URL to VideoEmbed', async () => {
      const user = userEvent.setup()
      const videos = [{ label: 'Arte FR', url: 'https://www.arte.tv/fr/videos/120894-000-A/some-title/' }]
      render(<VideoAccordion videos={videos} emptyMessage="No videos" />)

      const button = screen.getByRole('button')
      await user.click(button)

      const embed = screen.getByTestId('video-embed')
      expect(embed).toHaveAttribute('data-url', 'https://www.arte.tv/fr/videos/120894-000-A/some-title/')
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
  })
})
