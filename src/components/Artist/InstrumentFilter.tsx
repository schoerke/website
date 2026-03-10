'use client'

import { INSTRUMENT_PRIORITY } from '@/components/Artist/artistConstants'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import { useTranslations } from 'next-intl'

interface InstrumentFilterProps {
  instruments: string[]
  selected: string[]
  onChange: (instruments: string[]) => void
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
  const tArtists = useTranslations('custom.pages.artists')

  // Sort instruments before rendering
  const sortedInstruments = sortInstruments(instruments)

  return (
    <ToggleGroup
      type="multiple"
      value={selected}
      onValueChange={onChange}
      className="mb-6 flex flex-wrap gap-2"
      aria-label={tArtists('filterByInstrument')}
    >
      {sortedInstruments.map((instrument) => {
        // Translation key for instrument (type assertion needed for dynamic keys)
        const translationKey = instrument as Parameters<typeof t>[0]
        return (
          <ToggleGroupItem key={instrument} value={instrument} aria-label={t(translationKey)} className="capitalize">
            {t(translationKey)}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

export default InstrumentFilter
