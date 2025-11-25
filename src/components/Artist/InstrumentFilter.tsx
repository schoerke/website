'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import { useTranslations } from 'next-intl'

type InstrumentFilterProps = {
  instruments: string[]
  selected: string[]
  onChange: (instruments: string[]) => void
}

// Define instrument category priority using the database keys (lowercase)
const INSTRUMENT_PRIORITY: { [key: string]: number } = {
  conductor: 1,
  piano: 2,
  'piano-forte': 2, // Same priority as piano
  violin: 3,
  cello: 4,
  viola: 5,
  bass: 6,
  // All other instruments (winds, chamber music, etc.) get category 7
}

/**
 * Sort instruments by priority order
 */
function sortInstruments(instruments: string[]): string[] {
  return [...instruments].sort((a, b) => {
    const priorityA = INSTRUMENT_PRIORITY[a] ?? 7
    const priorityB = INSTRUMENT_PRIORITY[b] ?? 7

    // First sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Then sort alphabetically
    return a.localeCompare(b)
  })
}

const InstrumentFilter: React.FC<InstrumentFilterProps> = ({ instruments, selected, onChange }) => {
  const t = useTranslations('custom.instruments')

  // Multi-select: value is array, onValueChange gives array
  const handleValueChange = (values: string[]) => {
    onChange(values)
  }

  // Sort instruments before rendering
  const sortedInstruments = sortInstruments(instruments)

  return (
    <ToggleGroup
      type="multiple"
      value={selected}
      onValueChange={handleValueChange}
      className="mb-6 flex flex-wrap gap-2"
      aria-label="Filter artists by instrument"
    >
      {sortedInstruments.map((instrument) => (
        <ToggleGroupItem key={instrument} value={instrument} aria-label={t(instrument as any)} className="capitalize">
          {t(instrument as any)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default InstrumentFilter
