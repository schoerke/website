// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import type { TextFieldClientProps } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const field = { value: '' as unknown }
let locale = 'de'

vi.mock('@payloadcms/ui', () => ({
  TextField: ({ field }: { field: { admin?: { className?: string } } }) => (
    <input data-warning-class={field.admin?.className} />
  ),
  useField: () => field,
  useLocale: () => ({ code: locale }),
}))

import QuoteField from './QuoteField'

const props = {
  field: { name: 'quote', type: 'text' },
  path: 'quote',
} as TextFieldClientProps

describe('QuoteField', () => {
  beforeEach(() => {
    field.value = ''
    locale = 'de'
  })

  it('keeps the warning visible without a dismissal control', () => {
    field.value = '“Intentional quote”'
    render(<QuoteField {...props} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveAttribute('data-warning-class', 'quote-field-warning')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not warn for unquoted text', () => {
    field.value = 'Unquoted text'
    render(<QuoteField {...props} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Bitte keine Anführungszeichen am Anfang oder Ende des Zitats verwenden.')).toHaveClass(
      'quote-field-warning-hidden'
    )
  })

  it('renders English warning copy for the English locale', () => {
    locale = 'en'
    field.value = '“Intentional quote”'
    render(<QuoteField {...props} />)

    expect(screen.getByText('Remove quotation marks from the beginning or end of the quote.')).toBeInTheDocument()
  })
})
