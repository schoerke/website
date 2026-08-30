import { describe, expect, it } from 'vitest'

import { Artists } from './Artists'

describe('Artists', () => {
  it('defines a localized optional quote source below the quote field', () => {
    const tabs = Artists.fields?.find((field) => field.type === 'tabs')
    const biographyTab = tabs?.tabs?.find(
      (tab) => typeof tab.label === 'object' && tab.label !== null && 'de' in tab.label && tab.label.de === 'Biographie'
    )
    const fields = biographyTab?.fields ?? []
    const quoteIndex = fields.findIndex((field) => 'name' in field && field.name === 'quote')
    const quoteSource = fields[quoteIndex + 1]

    expect(quoteIndex).toBeGreaterThanOrEqual(0)
    expect(fields[quoteIndex]).toMatchObject({
      admin: { components: { Field: '/components/admin/QuoteField' } },
      name: 'quote',
    })
    expect(quoteSource).toMatchObject({
      name: 'quoteSource',
      type: 'text',
      localized: true,
      required: false,
      label: { de: 'Zitatquelle', en: 'Quote source' },
    })
  })
})
