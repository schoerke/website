'use client'

import { useRowLabel } from '@payloadcms/ui'

type PerformerRow = {
  name?: string
}

function fallbackLabel(rowNumber?: number): string {
  return `Performer ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
}

const PerformerRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<PerformerRow>()

  return <div>{data?.name?.trim() || fallbackLabel(rowNumber)}</div>
}

export default PerformerRowLabel
