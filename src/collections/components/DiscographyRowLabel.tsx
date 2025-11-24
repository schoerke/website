'use client'

import { useRowLabel } from '@payloadcms/ui'

// Static mapping for role labels (admin panel context)
const ROLE_LABELS: Record<string, string> = {
  soloist: 'Soloist',
  conductor: 'Conductor',
  ensemble_member: 'Ensemble Member',
  chamber_musician: 'Chamber Musician',
  accompanist: 'Accompanist',
}

const DiscographyRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ role?: string }>()

  if (data?.role) {
    return <div>{ROLE_LABELS[data.role] || data.role}</div>
  }

  return <div>{`Role Section ${String(rowNumber).padStart(2, '0')}`}</div>
}

export default DiscographyRowLabel
