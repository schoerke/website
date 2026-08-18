import { describe, expect, it } from 'vitest'
import { parseIframeEmbed } from './audioEmbed'

const RTS_SNIPPET = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" frameborder="0" allowfullscreen="true" allow="fullscreen; geolocation *; autoplay; encrypted-media" name="Concert en direct"></iframe>`

describe('parseIframeEmbed', () => {
  it('parses src, width, height and title from a valid snippet', () => {
    const snippet = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462" width="392" height="58" title="Concert"></iframe>`
    expect(parseIframeEmbed(snippet)).toEqual({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462',
      width: 392,
      height: 58,
      title: 'Concert',
    })
  })

  it('handles missing optional attributes', () => {
    expect(parseIframeEmbed(RTS_SNIPPET)).toMatchObject({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:14033462',
      width: 392,
      height: 58,
    })
  })

  it('returns null when src is missing', () => {
    expect(parseIframeEmbed('<iframe width="392" height="58"></iframe>')).toBeNull()
  })

  it('returns null for non-snippet garbage', () => {
    expect(parseIframeEmbed('not an iframe at all')).toBeNull()
    expect(parseIframeEmbed('')).toBeNull()
  })

  it('uses the real src, not a data-src attribute', () => {
    const snippet = `<iframe data-src="https://evil.example.com/x" src="https://www.rts.ch/play/embed?urn=urn:rts:audio:1"></iframe>`
    expect(parseIframeEmbed(snippet)).toMatchObject({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:1',
    })
  })

  it('ignores src attributes outside the iframe tag', () => {
    const snippet = `<img src="https://evil.example.com/y"><iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:2"></iframe>`
    expect(parseIframeEmbed(snippet)).toMatchObject({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:2',
    })
  })

  it('supports single-quoted and uppercase attributes', () => {
    expect(parseIframeEmbed(`<iframe SRC='https://www.rts.ch/play/embed?urn=urn:rts:audio:3'></iframe>`)).toMatchObject(
      { src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:3' }
    )
  })

  it('returns null for a fake iframe tag (iframex)', () => {
    expect(parseIframeEmbed('<iframex src="https://www.rts.ch/x"></iframex>')).toBeNull()
  })

  it('extracts only src when no optional attrs present', () => {
    const snippet = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:1" onload="alert(1)" srcdoc="<script>alert(2)</script>" style="position:fixed"></iframe>`
    const parsed = parseIframeEmbed(snippet)
    expect(parsed).toEqual({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:1',
    })
  })
})
