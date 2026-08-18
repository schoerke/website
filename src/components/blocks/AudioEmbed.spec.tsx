// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import AudioEmbed from './AudioEmbed'

describe('AudioEmbed', () => {
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

  it('renders a Spotify embed iframe from a url', () => {
    render(<AudioEmbed url="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" />)
    const iframe = screen.getByTitle('Spotify track player')
    expect(iframe.getAttribute('src')).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT')
  })

  it('renders an iframe from an embedCode snippet', () => {
    const code =
      '<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" title="Concert"></iframe>'
    render(<AudioEmbed embedCode={code} />)
    const iframe = screen.getByTitle('Concert')
    expect(iframe.getAttribute('src')).toBe('https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462')
  })

  it('uses the default height when embedCode has no height', () => {
    render(<AudioEmbed embedCode='<iframe src="https://www.rts.ch/play/embed?urn=x"></iframe>' />)
    expect(screen.getByTitle('Audio player').getAttribute('height')).toBe('58')
  })

  it('discards junk attributes and uses hardened sandbox/allow', () => {
    const code =
      '<iframe src="https://www.rts.ch/x" width="392" height="58" title="X" onload="alert(1)" sandbox="allow-top-navigation" name="junk"></iframe>'
    render(<AudioEmbed embedCode={code} />)
    const iframe = screen.getByTitle('X')
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-popups')
    expect(iframe.getAttribute('allow')).toBe('autoplay; encrypted-media')
    expect(iframe.getAttribute('onload')).toBeNull()
    expect(iframe.getAttribute('name')).toBeNull()
    expect(iframe.getAttribute('src')).toBe('https://www.rts.ch/x')
  })

  it('refuses to render non-http(s) embed srcs', () => {
    render(<AudioEmbed embedCode='<iframe src="javascript:alert(1)"></iframe>' />)
    expect(screen.getByText('Audio embed error')).toBeInTheDocument()
  })

  it('refuses to render a src whose effective host is not allowlisted', () => {
    render(<AudioEmbed embedCode='<iframe src="https://www.rts.ch@evil.example.com/x"></iframe>' />)
    expect(screen.getByText('Audio embed error')).toBeInTheDocument()
  })

  it('shows an error box for an invalid embedCode', () => {
    render(<AudioEmbed embedCode="not an iframe" />)
    expect(screen.getByText('Audio embed error')).toBeInTheDocument()
  })

  it('shows an error box for an invalid url', () => {
    render(<AudioEmbed url="not-a-url" />)
    expect(screen.getByText('Audio embed error')).toBeInTheDocument()
  })

  it('shows an error box when neither url nor embedCode is provided', () => {
    render(<AudioEmbed />)
    expect(screen.getByText('Audio embed error')).toBeInTheDocument()
  })
})
