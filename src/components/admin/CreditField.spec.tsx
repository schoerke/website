// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { TextFieldClientProps } from 'payload'

import CreditField from './CreditField'

let fieldValue: unknown
let locale = 'de'

const fieldProps: TextFieldClientProps = {
  field: {
    name: 'credit',
    type: 'text',
  },
  path: 'credit',
}

vi.mock('@payloadcms/ui', () => ({
  TextField: ({ field, path }: { field: { admin?: { className?: string } }; path: string }) => (
    <input aria-label={path} data-warning-class={field.admin?.className} />
  ),
  useField: () => ({ value: fieldValue }),
  useLocale: () => ({ code: locale }),
}))

describe('CreditField', () => {
  it('shows the German warning for a leading lowercase marker', () => {
    fieldValue = '(c) Max Mustermann'
    locale = 'de'

    render(<CreditField {...fieldProps} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Bitte „(c)“ am Anfang des Bildnachweises entfernen.')
    expect(screen.getByRole('textbox')).toHaveAttribute('data-warning-class', 'credit-field-warning')
  })

  it('shows the English warning for a leading uppercase marker', () => {
    fieldValue = '(C) Max Mustermann'
    locale = 'en'

    render(<CreditField {...fieldProps} />)

    expect(screen.getByText('Remove “(c)” from the beginning of the photo credit.')).toBeVisible()
  })

  it('keeps warning space hidden when credit has no leading marker', () => {
    fieldValue = 'Photo (c) Max Mustermann'
    locale = 'de'

    render(<CreditField {...fieldProps} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('credit-warning')).toHaveClass('credit-field-warning-hidden')
    expect(screen.getByTestId('credit-warning')).not.toBeVisible()
  })
})
