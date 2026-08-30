'use client'

import { TextField, useField, useLocale } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

import { hasBoundaryQuotationMark } from '@/utils/quoteWarning'

import './QuoteField.scss'

const QuoteField: React.FC<TextFieldClientProps> = (props) => {
  const { code: locale } = useLocale()
  const { value: fieldValue } = useField<{ value?: unknown }>({ path: props.path })
  const value = typeof fieldValue === 'string' ? fieldValue : ''
  const showWarning = hasBoundaryQuotationMark(value)
  const field = {
    ...props.field,
    admin: {
      ...props.field.admin,
      className: [props.field.admin?.className, showWarning && 'quote-field-warning'].filter(Boolean).join(' '),
    },
  }
  const warning =
    locale === 'de'
      ? 'Bitte keine Anführungszeichen am Anfang oder Ende des Zitats verwenden.'
      : 'Remove quotation marks from the beginning or end of the quote.'

  return (
    <div>
      <TextField {...props} field={field} />
      <div className="quote-field-warning-space">
        <div role={showWarning ? 'alert' : undefined} className="quote-field-warning-message">
          <span className={showWarning ? undefined : 'quote-field-warning-hidden'}>{warning}</span>
        </div>
      </div>
    </div>
  )
}

export default QuoteField
