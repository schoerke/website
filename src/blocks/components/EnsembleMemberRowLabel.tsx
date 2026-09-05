'use client'

import { useLocale, useRowLabel } from '@payloadcms/ui'

type EnsembleMemberRow = {
  instrument?: string
  name?: string
}

function fallbackLabel(locale: 'de' | 'en', rowNumber?: number): string {
  const label = locale === 'de' ? 'Mitglied' : 'Member'
  return `${label} ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
}

const EnsembleMemberRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<EnsembleMemberRow>()
  const locale = useLocale()?.code === 'en' ? 'en' : 'de'
  const label = [data?.name?.trim(), data?.instrument?.trim()].filter(Boolean).join(' ')

  return <div>{label || fallbackLabel(locale, rowNumber)}</div>
}

export default EnsembleMemberRowLabel
