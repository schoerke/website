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

  it('ignores event handlers and srcdoc', () => {
    const snippet = `<iframe src="https://www.rts.ch/play/embed?urn=urn:rts:audio:1" onload="alert(1)" srcdoc="<script>alert(2)</script>" style="position:fixed"></iframe>`
    const parsed = parseIframeEmbed(snippet)
    expect(parsed).toEqual({
      src: 'https://www.rts.ch/play/embed?urn=urn:rts:audio:1',
    })
  })
})
