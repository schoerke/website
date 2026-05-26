'use client'

import { RECORDING_ROLES } from '@/constants/recordingOptions'
import { useRowLabel } from '@payloadcms/ui'

const ROLE_LABELS = Object.fromEntries(RECORDING_ROLES.map((r) => [r.value, r.label.en]))

const DiscographyRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ role?: string }>()

  if (data?.role) {
    return <div>{ROLE_LABELS[data.role] || data.role}</div>
  }

  return <div>{`Role Section ${String(rowNumber).padStart(2, '0')}`}</div>
}

export default DiscographyRowLabel
