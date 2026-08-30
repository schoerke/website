// @vitest-environment happy-dom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PayloadRichText from './PayloadRichText'

const richText = vi.fn()

vi.mock('@payloadcms/richtext-lexical/react', () => ({
  LinkJSXConverter: (options: unknown) => options,
  RichText: (props: unknown) => {
    richText(props)
    return null
  },
}))

describe('PayloadRichText internal links', () => {
  it('targets biography for artist documents', () => {
    render(
      <PayloadRichText
        content={{ root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } } as never}
        locale="en"
      />
    )

    const props = richText.mock.calls[0][0] as {
      converters: (args: { defaultConverters: object }) => { internalDocToHref: (args: unknown) => string }
    }
    const converters = props.converters({ defaultConverters: {} })

    expect(
      converters.internalDocToHref({
        linkNode: { fields: { doc: { relationTo: 'artists', value: { slug: 'jane-artist' } } } },
      })
    ).toBe('/en/artists/jane-artist#biography')
  })

  it('does not build an internal link from a non-string populated slug', () => {
    render(
      <PayloadRichText
        content={{ root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 } } as never}
        locale="en"
      />
    )

    const props = richText.mock.calls[0][0] as {
      converters: (args: { defaultConverters: object }) => { internalDocToHref: (args: unknown) => string }
    }
    const converters = props.converters({ defaultConverters: {} })

    expect(
      converters.internalDocToHref({
        linkNode: { fields: { doc: { relationTo: 'artists', value: { slug: 123 } } } },
      })
    ).toBe('#')
  })
})
