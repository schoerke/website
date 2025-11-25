'use client'

import { useRowLabel } from '@payloadcms/ui'

const RepertoireRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ title?: string }>()

  if (data?.title) {
    return <div>{data.title}</div>
  }

  return <div>{`Repertoire Section ${String(rowNumber).padStart(2, '0')}`}</div>
}

export default RepertoireRowLabel
