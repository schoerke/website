'use client'

import { INSTRUMENT_PRIORITY } from '@/components/Artist/artistConstants'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import { cn } from '@/lib/utils'
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
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      <ToggleGroup
        type="multiple"
        value={selected}
        onValueChange={onChange}
        className="flex flex-wrap justify-center gap-2"
        aria-label={tArtists('filterByInstrument')}
      >
        {sortedInstruments.map((instrument) => {
          const translationKey = instrument as Parameters<typeof t>[0]
          return (
            <ToggleGroupItem key={instrument} value={instrument} aria-label={t(translationKey)} className="capitalize">
              {t(translationKey)}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          aria-label={tArtists('clearAll')}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-2 text-sm font-medium h-9 min-w-9',
            'bg-gray-100 hover:bg-gray-200 transition-colors',
          )}
        >
          {tArtists('clearAll')}
        </button>
      )}
    </div>
  )
}

export default InstrumentFilter
