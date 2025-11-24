'use client'

import { useRowLabel } from '@payloadcms/ui'

const YouTubeLinkRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ label?: string | { de?: string; en?: string } }>()

  if (data?.label) {
    // Handle localized label (if label is an object with de/en keys)
    if (typeof data.label === 'object' && data.label !== null) {
      const labelValue = data.label.de || data.label.en || ''
      if (labelValue) {
        return <div>{labelValue}</div>
      }
    }

    // Handle non-localized label (string)
    if (typeof data.label === 'string' && data.label.trim()) {
      return <div>{data.label}</div>
    }
  }

  return <div>{`Video ${String(rowNumber).padStart(2, '0')}`}</div>
}

export default YouTubeLinkRowLabel
