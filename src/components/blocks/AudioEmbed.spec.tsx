// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AudioEmbed from './AudioEmbed'

describe('AudioEmbed', () => {
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
