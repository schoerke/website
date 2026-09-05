'use client'

import { useRowLabel } from '@payloadcms/ui'

type EnsembleGroupRow = {
  groupName?: string
}

function fallbackLabel(rowNumber?: number): string {
  return `Ensemble Group ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
}

const EnsembleGroupRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<EnsembleGroupRow>()

  return <div>{data?.groupName?.trim() || fallbackLabel(rowNumber)}</div>
}

export default EnsembleGroupRowLabel
