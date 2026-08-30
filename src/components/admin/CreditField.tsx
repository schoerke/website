'use client'

import { TextField, useField, useLocale } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

import { normalizeImageCredit } from '@/utils/imageCredit'

import './CreditField.scss'

type CreditFieldProps = TextFieldClientProps

const CreditField: React.FC<CreditFieldProps> = (props) => {
  const { code: locale } = useLocale()
  const { value } = useField<string | undefined>({ path: props.path })
  const hasLeadingMarker = typeof value === 'string' && normalizeImageCredit(value) !== value
  const field = {
    ...props.field,
    admin: {
      ...props.field.admin,
      className: [props.field.admin?.className, hasLeadingMarker && 'credit-field-warning'].filter(Boolean).join(' '),
    },
  }
  const warning =
    locale === 'de'
      ? 'Bitte „(c)“ am Anfang des Bildnachweises entfernen.'
      : 'Remove “(c)” from the beginning of the photo credit.'

  return (
    <div>
      <TextField {...props} field={field} />
      <div className="credit-field-warning-space mt-2">
        <div role={hasLeadingMarker ? 'alert' : undefined} className="text-sm text-warning">
          <span
            className={hasLeadingMarker ? undefined : 'credit-field-warning-hidden'}
            data-testid="credit-warning"
            style={hasLeadingMarker ? undefined : { visibility: 'hidden' }}
          >
            {warning}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CreditField
