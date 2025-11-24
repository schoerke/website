'use client'

import { useRowLabel } from '@payloadcms/ui'

const RepertoireRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ title?: string }>()

  return <div>{data?.title || `Section ${String(rowNumber).padStart(2, '0')}`}</div>
}

export default RepertoireRowLabel
