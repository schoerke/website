// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import VideoEmbed from './VideoEmbed'

describe('VideoEmbed', () => {
  beforeAll(() => {
    // Mock iframe element to prevent happy-dom network requests
    const originalCreateElement = document.createElement.bind(document)
    document.createElement = function (tagName: string, options?: ElementCreationOptions) {
      if (tagName.toLowerCase() === 'iframe') {
        const div = originalCreateElement('div', options) as unknown as HTMLIFrameElement
        div.setAttribute('data-mock-iframe', 'true')
        Object.defineProperty(div, 'src', {
          get() {
            return this.getAttribute('src') || ''
          },
          set(value: string) {
            this.setAttribute('src', value)
          },
        })
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

  it('renders a YouTube iframe from a url', () => {
    render(<VideoEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
    const iframe = screen.getByTitle('youtube video player')
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('renders an iframe from an embedCode snippet', () => {
    const code =
      '<iframe src="https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761" width="392" height="220" title="Orchestra della Svizzera Italiana"></iframe>'
    render(<VideoEmbed embedCode={code} />)
    const iframe = screen.getByTitle('Orchestra della Svizzera Italiana')
    expect(iframe.getAttribute('src')).toBe('https://www.rsi.ch/play/embed?urn=urn:rsi:video:2051761')
    expect(iframe.getAttribute('width')).toBe('100%')
    expect(iframe.getAttribute('height')).toBe('220')
  })

  it('uses width 100% and a default height when embedCode has no dimensions', () => {
    render(
      <VideoEmbed embedCode='<iframe src="https://www.ardmediathek.de/embed/Y3JpZDovL2FyZC5kZS92aWRlby0xNjA4Nw"></iframe>' />
    )
    const iframe = screen.getByTitle('Video player')
    expect(iframe.getAttribute('width')).toBe('100%')
    expect(iframe.getAttribute('height')).toBe('315')
  })

  it('adds fullscreen support for video embeds', () => {
    render(<VideoEmbed embedCode='<iframe src="https://www.rsi.ch/play/embed?urn=x"></iframe>' />)
    const iframe = screen.getByTitle('Video player')
    expect(iframe.getAttribute('allowfullscreen')).not.toBeNull()
    expect(iframe.getAttribute('allow')).toContain('fullscreen')
  })

  it('discards junk attributes and uses hardened sandbox/allow', () => {
    const code =
      '<iframe src="https://www.rsi.ch/x" width="392" height="220" title="X" onload="alert(1)" sandbox="allow-top-navigation" name="junk"></iframe>'
    render(<VideoEmbed embedCode={code} />)
    const iframe = screen.getByTitle('X')
    expect(iframe.getAttribute('sandbox')).toBe(
      'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox'
    )
    expect(iframe.getAttribute('onload')).toBeNull()
    expect(iframe.getAttribute('name')).toBeNull()
    expect(iframe.getAttribute('src')).toBe('https://www.rsi.ch/x')
  })

  it('refuses to render non-http(s) embed srcs', () => {
    render(<VideoEmbed embedCode='<iframe src="javascript:alert(1)"></iframe>' />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('refuses to render a src whose effective host is not allowlisted', () => {
    render(<VideoEmbed embedCode='<iframe src="https://www.rsi.ch@evil.example.com/x"></iframe>' />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('refuses to render an http (non-https) src from an allowlisted host', () => {
    render(<VideoEmbed embedCode='<iframe src="http://www.rsi.ch/play/embed?urn=x"></iframe>' />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('shows an error box for an invalid embedCode', () => {
    render(<VideoEmbed embedCode="not an iframe" />)
    expect(screen.getByText('Video embed error')).toBeInTheDocument()
  })

  it('renders nothing when neither url nor embedCode is provided', () => {
    const { container } = render(<VideoEmbed />)
    expect(container).toBeEmptyDOMElement()
  })
})
